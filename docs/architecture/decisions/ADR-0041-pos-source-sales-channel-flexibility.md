# ADR-0041 — POS Source / Sales Channel Flexibility: Per-Entry, Not a Fixed Mapping

## Context

Sprint 2C/2D/2B-Prep built `DailySalesRecord` with a single header-level POS
report (`posReportType`/`posReportNumber`/`posReportedTotal`) and a
Restaurant-scoped `SalesChannel` master list (`ADR-0039`). That shape
implicitly assumed one POS terminal per Branch per day.

Real restaurant POS setups vary and must not be hardcoded:

- **Example A** — one POS covers every channel (POS 1 reports MyPOS, Wolt,
  and Bolt together on one Z Report).
- **Example B** — multiple POS terminals each cover a different subset of
  channels (POS 1 = MyPOS only, POS 2 = Wolt + Bolt), reported as two
  separate Z Reports for the same business day.
- **Example C** — a single POS and a single channel (the common case today
  for both Burger's Ink and Topo Gigio).

The system must represent POS Source and Sales Channel as two independent
dimensions, with an arbitrary and non-permanent relationship between them —
never `POS 1 = MyPOS`/`POS 2 = Wolt` as a fixed assumption anywhere in the
schema or code.

## The existing model, inspected first

- `SalesChannel` (ADR-0039) is already Restaurant-scoped and configurable
  (`@@unique([restaurantId, name])`), created inline from the Daily Sales
  entry form — no schema change needed there; channels were already
  dynamic.
- **No POS Source entity existed.** POS report metadata lived directly on
  `DailySalesRecord`, one set of fields per record, matching
  `@@unique([branchId, businessDate])` — i.e. the schema assumed exactly
  one POS report per Branch per day.
- `SalesChannelEntry` linked a record to a channel with only `amount`; no
  transaction count, no POS-source reference.
  `SalesPaymentMethodEntry.transactionCount` already existed as a direct
  precedent to copy.
- Weekly aggregation (`sales-aggregation.service.ts`) grouped only by
  `salesChannelId`/`salesPaymentMethodId`/`salesCategoryId` — no POS-source
  dimension existed in reporting.

## Decision 1: `PosSource` is a fourth Restaurant-scoped master list

Structurally identical to `SalesChannel`/`SalesPaymentMethod`/
`SalesCategory` — `id`/`restaurantId`/`name`, `@@unique([restaurantId, name])`,
created inline the same way channels already are. No relationship to
`SalesChannel` at the master-list level.

## Decision 2: the POS↔channel relationship is per-entry, not a fixed mapping

Rejected: adding a `posSourceId` column to `SalesChannel` itself. That would
hardcode "Wolt always belongs to POS 2," which breaks the explicit
requirement that a channel may be reported through different POS systems
over time, and would force every restaurant into a single, permanent
POS-to-channel topology.

Chosen: an **optional** `posSourceId` directly on `SalesChannelEntry` — each
day's channel-amount line optionally records which POS reported it.

- Example C restaurants (all real data as of this sprint) never set it —
  stays `null` everywhere, zero behavior change, zero migration risk.
- Example A: every channel line for that day carries the same
  `posSourceId`, or the manager skips it entirely.
- Example B: the MyPOS line carries POS 1's id; the Wolt and Bolt lines
  carry POS 2's id — same `DailySalesRecord`, same business day, different
  `posSourceId` per line.
- Nothing prevents a channel from carrying a different `posSourceId` on a
  different day — the relationship is a fact about that day's entry, never
  a permanent assignment.

Also added `transactionCount Int?` to `SalesChannelEntry`, copying
`SalesPaymentMethodEntry.transactionCount` exactly — channels can now
report a transaction count the same way payment methods already could.

## Decision 3: POS report header metadata stays exactly as-is (confirmed with the user)

`DailySalesRecord.posReportType`/`posReportNumber`/`posReportedTotal` are
untouched — no `SalesPosReport` child table this sprint, even though a
genuinely multi-terminal day (Example B) technically produces two distinct
Z Reports. Per-POS granularity is captured entirely at the
`SalesChannelEntry` level, which is what actually answers "sales by POS
source" and "sales by POS + channel" (the two new reporting questions this
sprint needed to answer). A restaurant on a two-terminal day can note both
report numbers in the existing free-text `posReportNumber` field if they
want a record of it (e.g. "851 / 852"); the structured, query-able
breakdown lives in the entries, not the header.

## Reporting

`sales-aggregation.service.ts`'s `getWeeklySummary` gained two purely
computed fields, alongside the existing `channelTotals`:

- `posSourceTotals[]` — Σ amount / Σ transactionCount per POS source,
  including an explicit `{ posSourceId: null, posSourceName: null, ... }`
  "unassigned" bucket for entries with no `posSourceId` set. The unassigned
  bucket is never dropped — a restaurant that starts tagging POS sources
  partway through a week still sees every euro accounted for somewhere.
- `channelsByPosSource[]` — one row per POS source (including unassigned),
  each carrying its own per-channel breakdown, answering "sales by POS +
  channel combination" without assuming a channel belongs to exactly one
  POS (the same channel can appear under multiple POS-source buckets
  across different entries or different days).

The frontend's new `PosSourcePerformanceSection` renders only when at
least one channel entry has actually been tagged with a real POS source
(`posSourceTotals.some(p => p.posSourceId !== null)`) — a restaurant that
never touches the optional POS Source field sees nothing new; its figures
remain fully covered by the existing `ChannelPerformanceSection`.

## Consequences

Positive: arbitrary POS↔channel topologies (Examples A/B/C, and anything
in between) are representable without a schema change per topology;
zero behavior change or migration risk for every restaurant using the
system today (all currently Example C); `SalesChannelEntry`'s new columns
are both nullable, so no backfill is required; POS Source and Sales
Channel remain structurally independent, matching ADR-0039's precedent of
keeping Sales Channel and Payment Method independent rather than
conflating related-but-distinct concepts.

Negative, accepted: a genuinely multi-terminal day still has only one
header-level `posReportNumber` string field for two real Z Reports; if
per-report reconciliation (each POS's own report total vs. its own
channel entries) becomes a real requirement, that is a future, separate
`SalesPosReport` child table — deliberately deferred per Decision 3 above,
confirmed with the user rather than assumed.

Out of scope, explicitly: this ADR does not touch POS/Wolt/Bolt API
integration, automatic Z-Report parsing, or any change to Sprint 2C's
duplicate-day policy (`@@unique([branchId, businessDate])` on
`DailySalesRecord` is untouched) — all remain future, separate work.

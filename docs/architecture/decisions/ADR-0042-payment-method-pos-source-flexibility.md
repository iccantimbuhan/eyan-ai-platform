# ADR-0042 — Payment Method POS Source Flexibility, and a Shared Uniqueness Fix

## Context

ADR-0041 gave `SalesChannelEntry` an optional `posSourceId` so a channel's
daily amount can be attributed to the POS terminal that reported it. A
follow-up requirement surfaced the same need for `SalesPaymentMethodEntry`:
a restaurant running multiple POS terminals can report different payment
methods per terminal (e.g. POS 1: Cash/Card/Wolt, POS 2: Wolt/Bolt), with
the same payment method (Wolt) legitimately appearing under more than one
POS on the same business day.

An architecture assessment (presented and approved before implementation)
inspecting the current Payment Method/POS Source stack surfaced a second,
pre-existing issue: `SalesChannelEntry`'s own unique constraint
(`@@unique([dailySalesRecordId, salesChannelId])`, unchanged since Sprint
2C and not touched by ADR-0041) limits a channel to **one entry per day,
total** — it could not yet be split across two POS terminals on the same
day either, despite ADR-0041's text suggesting otherwise. Both entry types
needed the same fix, so this ADR corrects them together.

## Decision 1: `SalesPaymentMethodEntry.posSourceId`, mirroring `SalesChannelEntry` exactly

```prisma
model SalesPaymentMethodEntry {
  ...
  posSourceId String?
  posSource   PosSource? @relation(fields: [posSourceId], references: [id], onDelete: SetNull)
  ...
}
```

Same posture as ADR-0041: optional, `onDelete: SetNull`, never a fixed
mapping on `SalesPaymentMethod` itself — the POS↔payment-method
relationship is a per-entry, per-day fact. `PosSource` gained a
`paymentMethodEntries` back-relation alongside its existing
`channelEntries`; it remains structurally unaware of either master list.

## Decision 2: widen both entry types' unique constraints to include `posSourceId`

```
SalesChannelEntry:       [dailySalesRecordId, salesChannelId]              -> [..., posSourceId]
SalesPaymentMethodEntry: [dailySalesRecordId, salesPaymentMethodId]        -> [..., posSourceId]
```

Without this, a channel or payment method would still be limited to one
entry per day regardless of `posSourceId` — the exact overlap scenario
(the same channel or payment method reported separately by two POS
terminals on the same day) would 409 on the second entry. Widening from 2
to 3 columns is a strict relaxation: every row satisfying the old
constraint still satisfies the new one, so this is purely additive from
the data's perspective even though it alters an existing constraint
definition.

**NULL-safety caveat, and why the service layer changed too**: Postgres
treats `NULL` as distinct from every other `NULL` in a unique index, so a
naive 3-column unique index alone would silently *stop* rejecting a
duplicate no-POS entry (two rows with `posSourceId: NULL` would no longer
collide). The service-layer duplicate pre-check
(`findByRecordAndChannel`/`findByRecordAndMethod`) was changed from
`findUnique` on the compound key to `findFirst` with a plain equality
`where` clause — Prisma renders `posSourceId: null` as `IS NULL`, which is
the correct, NULL-safe check for both the tagged and untagged case. Every
existing call site (no `posSourceId` supplied) is unaffected — it still
finds the one true duplicate for that day.

## Decision 3: payment-method POS totals are a separate figure from channel POS totals — never merged

`SalesAggregationService.getWeeklySummary` gained
`paymentMethodPosSourceTotals[]`/`paymentMethodsByPosSource[]`, structured
identically to ADR-0041's `posSourceTotals[]`/`channelsByPosSource[]` but
computed and returned independently. A combined "per-POS total" (channel
amount + payment-method amount) was considered and rejected: a POS's
channel total and its payment-method total are independent facts about
that POS, exactly like the existing whole-day channel-vs-payment-method
relationship (ADR-0039 Decision 2) — summing them would silently introduce
a new reconciliation this system has deliberately avoided everywhere else.
Both bucket sets independently preserve the never-dropped "unassigned"
bucket (`posSourceId: null`) for entries that don't specify a POS.

## Frontend

`PaymentMethodEntrySection` gained the same optional POS Source `<Select>`
+ inline "Add POS Source" affordance already shipped on `ChannelEntrySection`
(reusing `usePosSources`/`useCreatePosSource` — no new hook). The existing
`PosSourcePerformanceSection` gained a second, independently-gated block:
the channel breakdown renders only when a channel entry has been tagged;
the payment-method breakdown renders only when a payment-method entry has
been tagged — a restaurant using POS sources for one dimension but not the
other sees exactly the sections that apply, and a restaurant using neither
sees nothing new, identical to before this ADR.

## Consequences

Positive: the data model now genuinely supports the requested topology —
one restaurant with a single POS/single-channel setup, another splitting
channels and payment methods arbitrarily across multiple POS terminals,
with the same channel or payment method legitimately appearing under more
than one POS on the same day. Zero behavior change or migration risk for
every restaurant using the system today (all currently single-POS, and the
one real `PosSource` row in the dev database as of this ADR has no
entries pointing at it yet). No backfill required.

Negative, accepted: widening a live unique constraint requires a `DROP
CONSTRAINT` + `CREATE UNIQUE INDEX` pair per table — at current row counts
(single-digit to low-hundreds per table) this is instantaneous, but is a
schema-lock operation worth noting at production-promotion time, unlike a
purely additive `ADD COLUMN`.

Out of scope, explicitly: this ADR does not touch `DailySalesRecord`'s own
POS-report header fields (`posReportType`/`posReportNumber`/`posReportedTotal`,
unchanged since ADR-0041 Decision 3), does not introduce a combined
channel+payment-method POS reconciliation figure, and does not touch
`SalesCategory`/`SalesItemEntry` or any POS/Wolt/Bolt API integration.

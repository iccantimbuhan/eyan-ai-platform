# ADR-0043: Cash Reconciliation — Computed, Not Stored, Built From Existing Fields

Status:
- Accepted

Date:
2026-08-08

## Context

`totalSales` is the POS-reported selling price and remains the source of truth (ADR-0039 Decision 3). It is not always what the manager actually collects: a manually-granted discount (a price break the POS itself can't record) means the money physically received is lower than `totalSales`, without `totalSales` itself being wrong. Managers need to reconcile the day's physical cash against what payment-method entries imply they should have received, accounting for that discount — without touching `totalSales` or the existing "never reconciled" posture ADR-0039/ADR-0042 established for channel/payment-method/POS totals.

## Decision

- `SalesPaymentMethod.isCashEquivalent: Boolean @default(false)` — a catalog-level flag. Physical Cash Basis is the sum of `SalesPaymentMethodEntry.amount` across every entry (any POS source) whose `salesPaymentMethod.isCashEquivalent` is true; everything else is Card/Electronic. Catalog-level (not per-entry, not per-POS-source) because the same payment-method name is already a distinct catalog row per restaurant, and no real topology today needs the same-named method to be cash on one POS and not another.
- `DailySalesRecord.discountsTotal` (existing field, unchanged) is reused as "Manual Discounts Today." No new discount field. It still never subtracts from `totalSales` — it only feeds Expected Cash.
- `DailySalesRecord.actualCashCounted: Decimal? @db.Decimal(10,2)` — one nullable, manager-entered figure per business day (not per POS source, not auto-calculated). Null means "not yet counted."
- Expected Cash, Discrepancy, and Status (`BALANCED | SHORT | OVER | NOT_COUNTED`) are **computed on every read**, never persisted — same posture as the existing `SalesReconciliationDto`/weekly aggregation (ADR-0039 Decision 7): `expectedCash = physicalCashBasis - discountsTotal`; `discrepancy = actualCashCounted - expectedCash`.
- This is a new, separate `CashReconciliationDto`, not an extension of the existing `SalesReconciliationDto` (which compares `totalSales` vs `posReportedTotal` vs channel-entry sums and is explicitly not about cash or payment methods) — keeping the two concepts visibly distinct in both the API and the UI, per the requirement that Total Sales, Expected Cash, and Actual Cash Counted never be conflated into one number.

## Consequences

Positive:
- Two additive, nullable/defaulted columns; zero impact on existing rows or existing reconciliation behavior.
- No new duplicated derived data — Physical Cash Basis and Expected Cash stay a function of data that already exists (payment-method entries, `discountsTotal`).
- Dynamic by construction: adding a new POS source or payment method requires no schema change, only setting `isCashEquivalent` on the relevant catalog row.

Negative:
- A single day-level `actualCashCounted` can't catch an over/short on one POS terminal offset by the opposite on another (e.g. two physical drawers). Accepted for this sprint since no current example needs per-POS counting; revisit only if a real restaurant's workflow requires it.
- `SalesPaymentMethod` gains its first mutable field, requiring a new `PATCH` endpoint on a previously create/list-only reference list — a small, deliberate divergence from the other three reference types (`SalesChannel`, `SalesCategory`, `PosSource`), which stay create/list-only.

## Alternatives Considered

1. A new `manualDiscountsToday` field separate from `discountsTotal` — rejected: `discountsTotal` already has identical semantics (manager-entered, header-level, never netted into `totalSales`); a second field would just invite drift between the two.
2. `isCashEquivalent` per `SalesPaymentMethodEntry` (or a POS-source override table) — rejected as unnecessary complexity; no real topology today needs the same-named payment method to be cash on one POS and not another, and this can be added later without breaking the catalog-level default.
3. Per-POS-source `actualCashCounted` (a new entry table keyed by `posSourceId`) — rejected for this sprint in favor of the single day-level figure every example in the spec uses; catalog-level flag and the day-level figure both keep this sprint's blast radius to two columns.

## Notes

`actualCashCounted` is Sales-module-scoped. ADR-0032 (Daily Closing, proposed/unimplemented) reserves a `CASH_RECONCILED` step in a broader cross-module closing workflow; when that workflow is built, it should read this field rather than duplicate it.

## Amendment (2026-08-08): POS-Scoped Manual Discount

**Context.** The original Decision above computed `physicalCashBasis` as one combined sum across every POS source, then subtracted `discountsTotal` from that single combined figure. A manager reported this is wrong for a real, common case: a discount is granted against one specific POS terminal's cash (e.g. POS 1's Trust Pay/Card Payment + Cash Draw), and must not reduce a different POS terminal's cash (e.g. POS 2's Bolt Cash) that was never discounted. The original formula had no way to express that scope.

**Decision.**
- `DailySalesRecord.discountPosSourceId: String?` (FK → `PosSource`, `onDelete: SetNull`) — which POS source `discountsTotal` is scoped to. **`null` means "all POS sources"** — the exact combined-total behavior every record had before this amendment, preserved byte-for-byte for every existing row (the column defaults to `NULL` on migration; nothing is backfilled or inferred).
- `discountsTotal` itself is unchanged — still the one manager-entered "Manual Discounts Today" figure, still never subtracted from `totalSales`. Only its *scope* is new.
- `computeCashReconciliation()` now groups cash entries into per-POS-source buckets (same `"unassigned"`-bucket convention `SalesAggregationService` already uses for channel/payment-method totals). The bucket whose `posSourceId` matches `discountPosSourceId` gets `expectedCash = grossCashBasis - discountsTotal`; every other bucket gets `expectedCash = grossCashBasis` — the discount is applied exactly once, never split, never applied to an unselected POS source.
- The **overall** `expectedCash` is unchanged in formula — still `physicalCashBasis - discountsTotal` — because summing gross cash across every bucket and then subtracting one flat discount produces the same total regardless of which bucket "owns" that subtraction for display. Only the per-bucket breakdown changes with the scope; the total never does. This is why every pre-amendment record (`discountPosSourceId = null`) computes an identical `expectedCash`/`discrepancy`/`status` to before, with zero data migration.
- `isCashEquivalent` remains the sole source of truth for whether a payment method is physical cash — never inferred from a payment method's or POS source's name (not "Cash Draw," not "Bolt Cash," not "Trust Pay/Card Payment"). `discountPosSourceId` is likewise never inferred from a name; it is only ever the manager's explicit selection.
- `actualCashCounted` stays exactly what it was: one nullable figure per business day, not per POS source. A POS-scoped *discount* does not imply a POS-scoped *cash count* — the manager still counts and reports one physical cash total at closing.
- `CashReconciliationDto` gains `discountPosSourceId`, `discountPosSourceName`, and `cashByPosSource: { posSourceId, posSourceName, grossCashBasis, discountApplied, expectedCash }[]` — additive only; every field from the original Decision (`physicalCashBasis`, `cardElectronicTotal`, `totalPaymentMethods`, `manualDiscounts`, `expectedCash`, `actualCashCounted`, `discrepancy`, `status`) keeps its exact prior name and meaning.
- A discount scoped to a POS source with zero cash entries recorded yet that day still surfaces as its own bucket (`grossCashBasis: "0.00"`, `expectedCash` negative) rather than silently vanishing — consistent with this ADR's "surface variance, never hide the calculation" posture.

**Consequences.**

Positive: one additive nullable FK column; every existing record's calculation is provably unchanged (the overall formula literally does not change); the UI can now show "Discountable Physical Cash — POS 1" separately from "Non-Discountable Physical Cash — POS 2" instead of implying a discount touched cash it never did.

Negative: this models exactly one discount scoped to exactly one POS source per day, matching the reported real-world case. Two different discount amounts split across two different POS sources on the same day is not supported — if that need arises, it would require a second, separate iteration (e.g. a small per-POS discount line table), not built preemptively here.

**Alternative considered and rejected:** inferring the discount's POS scope from which payment methods look "discountable" by name or position — rejected outright; scope is only ever the manager's explicit `discountPosSourceId` selection.

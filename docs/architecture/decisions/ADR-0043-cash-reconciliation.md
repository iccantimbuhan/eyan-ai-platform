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

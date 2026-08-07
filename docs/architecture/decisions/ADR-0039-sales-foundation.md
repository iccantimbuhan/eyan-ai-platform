# ADR-0039 — Sales Foundation: Branch-Scoped Daily Records, Channel/Payment-Method Separation

## Context

The restaurant currently records daily sales manually in a spreadsheet, sourced from a printed POS Z Report plus Wolt/Bolt/MyPOS/cash channel totals. Sprint 2C is not a POS integration — it replaces the spreadsheet as the structured source of truth for the same manually-observed figures, while leaving room for a future WhatsApp/OCR/AI ingestion pipeline to populate the same model without a redesign. Explicitly out of scope: POS API integration, WhatsApp/OCR/AI, recipe-based inventory consumption, purchasing, daily closing, and any profitability/food-cost calculation.

ADR-0037 and ADR-0038 already established the ownership split this sprint had to fit into: Restaurant owns product knowledge (`MenuItem`, `Ingredient`, `Unit`, ...); Branch owns operational, day-to-day facts (`InventoryItem`/`StockMovement`, Sprint 2A). Sales is a second instance of Branch-owned operational data, not a new tier.

## Decision 1: One `DailySalesRecord` per Branch per business day

`DailySalesRecord` (`branchId`, `restaurantId` denormalized, `businessDate`, `source`, POS metadata, `totalSales`, `discountsTotal`, `vouchersAmount`/`vouchersCount`, `notes`) is unique on `(branchId, businessDate)`. A Z Report represents one register-closing per POS terminal per day, and this restaurant runs one POS per branch today — one record per branch per day is the correct model for the business as it actually operates. A second create attempt for the same branch+date returns 409 (`DailySalesRecordAlreadyExistsError`); the manager corrects the existing record via `PATCH` rather than creating a duplicate. If a future branch genuinely runs multiple terminals, that's a schema extension (drop the uniqueness or add a terminal/sequence dimension) — not something this sprint should guess at and build speculatively.

## Decision 2: Channel and payment method are separate master lists, never reconciled against each other or against totals

`SalesChannel` (Wolt, Bolt, MyPOS, POS/In-house, Cash, ...) and `SalesPaymentMethod` (Cash Guard, Electronic, Wolt, Bolt, Cash Draw, ...) are two distinct Restaurant-scoped configurable master lists — same posture as `Unit`/`IngredientCategory` (ADR-0037): not hardcoded enums, a manager adds a new one inline from the entry form when the business starts using it. `SalesChannelEntry` and `SalesPaymentMethodEntry` are two distinct child tables of `DailySalesRecord`. Nothing in this sprint requires channel totals to sum to `totalSales`, or payment-method totals to sum to channel totals, or either to sum to `posReportedTotal`. If a manager enters Wolt €229.05 + Bolt €152.25 + MyPOS €213.20 + Cash €264.15 against a POS total of €1,226.55, the mismatch is preserved exactly as entered — no automatic adjustment, no silently "fixed" total. Reconciliation, if ever needed, is a future feature built on top of these preserved raw figures, not a Sprint 2C concern.

## Decision 3: `totalSales` (authoritative) is stored separately from `posReportedTotal` (raw POS metadata)

`totalSales` is the one figure daily/weekly aggregation sums — the headline number a manager reports as "today's sales." `posReportedTotal` is the number literally printed on the Z/X report, stored alongside `posReportType`/`posReportNumber` as POS report metadata so the system can say "this record came from POS Z Report 851," per the spec's own framing. The two usually agree but are never derived from one another; both are entered by the manager from what they're looking at. Raw screenshot/OCR data is explicitly not stored in this sprint — only the transcribed reference (type/number/total).

## Decision 4: `SalesCategory` is independent of `MenuCategory`

POS-printed sales families ("BCRS," "Bolt Food," "Pizza," "Chicken") are not guaranteed to mean the same thing as a `MenuCategory` built for the digital menu — forcing that equivalence without verifying it would silently corrupt category-level reporting the moment the two vocabularies diverge (as they likely already do — Burger's Ink and Topo Gigio's real Menu Categories were built for a different purpose, see ADR-0037's onboarding notes). `SalesCategory` is its own Restaurant-scoped master list. This also keeps Sales usable independently of how far along a restaurant's Menu Category/Recipe data entry is.

## Decision 5: Itemized sales snapshot `itemName`/`categoryName`; `menuItemId` is an optional, nullable, `SetNull` cross-reference only

`SalesItemEntry` stores `itemName`/`categoryName` as plain strings captured at write time, exactly as the manager typed or selected them. `menuItemId` may optionally link to a real `MenuItem` (for future reporting), but the relation is `onDelete: SetNull` and the response DTO never falls back to reading the live `MenuItem` row for display — the snapshot is the only thing rendered. Renaming, disabling, or deleting a `MenuItem` later can never corrupt or orphan a historical sales line, which the spec calls out as a hard requirement (the business's real menu changes over time; a 2026 sales report for "Margherita" must stay readable even if that item is renamed or removed in 2027).

## Decision 6: Individual line-entry CRUD, not a batch/nested-array payload

Each of the four line types (channel/payment-method/category/item) is created and deleted through its own endpoint nested under the record's id (`POST/DELETE /sales/:salesId/channel-entries[/:entryId]`, etc.) — mirroring `RecipeIngredient`'s existing pattern of a header resource (`Recipe`) accumulating typed child lines one at a time (ADR-0037), rather than inventing a new "submit the whole day as one nested-array payload" API shape nobody else in the codebase uses. The header (`DailySalesRecord` itself: date, source, POS fields, `totalSales`, discounts, vouchers, notes) is created/updated on its own via `POST`/`PATCH /branches/:branchId/sales` and `PATCH /sales/:salesId`. The frontend dialog still presents all of this as one continuous flow — the API shape is an implementation detail, not something the manager needs to think about.

## Decision 7: Daily/weekly aggregation is computed on every read, never stored

`GET /branches/:branchId/sales/daily?date=` resolves the one record for that branch+date directly. `GET /branches/:branchId/sales/weekly?startDate=&endDate=` fetches every `DailySalesRecord` (with its four line-entry relations) in the range in one query, then computes totals, per-channel/per-payment-method/per-category sums, and top items in plain `Prisma.Decimal` arithmetic in the service layer — no stored weekly total, no stored "best day," no raw SQL aggregation or new query infrastructure. This mirrors `StockStatus`'s computed-not-stored precedent (ADR-0038) and matches the spec's own RAW INPUT vs. CALCULATED SUMMARY distinction: realistic weekly row counts (a handful of records, each with a handful of lines) make in-memory summation the right level of complexity, not a BI engine.

## Decision 8: Authorization reuses Inventory's guard factory and TenantRole pattern exactly; write roles confirmed with the user

`DailySalesRecord` is Branch-scoped, so `requireSalesRecordAccess` is built from the **existing** `createBranchScopedAccessGuard` factory (ADR-0038) — the same factory `requireInventoryItemAccess` uses, just given a different `findById`. No new authorization pattern was introduced. Reads (daily/weekly retrieval, single-record `GET`) require only the access guard — any `BranchMember` role can view, matching Inventory. Writes (record create/update, all four line-entry create/delete actions, and the three master-list create routes) additionally require `requireTenantRole('OWNER', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT')` — confirmed with the user before implementation. This differs from Inventory's write list (`INVENTORY_STAFF` swapped for `ACCOUNTANT`) because Sales is financial/bookkeeping data an Accountant would plausibly need to enter or correct, whereas Inventory Staff has no natural relevance here. `CASHIER`, `KITCHEN`, and legacy `STAFF` can view but not mutate.

Master-list writes (`SalesChannel`/`SalesPaymentMethod`/`SalesCategory` create) also require the same write-role list, unlike `Unit`/`Ingredient`/etc.'s unrestricted-to-any-member writes (ADR-0037) — a deliberate, narrower policy for financial reference data, confirmed as part of the same user decision as Decision 8's write-role list.

## Consequences

Positive: every mechanism this sprint needed already existed — `createBranchScopedAccessGuard`, `requireTenantRole`, the 5-layer controller/service/repository/DTO/mapper/validator pattern, the `Decimal`-to-string-only-at-the-mapper-boundary rule, and the Restaurant-scoped-configurable-master-list pattern (`Unit`/`IngredientCategory`). No new authorization pattern, no new persistence pattern.

Negative, accepted for now: no `DELETE` endpoint exists for `DailySalesRecord` or the three master lists — not in this sprint's Definition of Done, same minimalism ADR-0038 accepted for Inventory. A mis-entered header is corrected via `PATCH`; a mis-entered line is deleted and re-added.

Negative, accepted for now: `SalesChannel`/`SalesPaymentMethod`/`SalesCategory` are "soft labels" like `IngredientCategory` — renaming one (not built this sprint either, only create+list exist) would, if added later, retroactively relabel every historical entry that references it. This is consistent with `IngredientCategory`'s existing behavior in this codebase, not a new risk introduced here.

Negative, known and expected: Sales and Inventory remain completely independent in this sprint — no `StockMovement` is created from a sale, no `InventoryItem.currentQuantity` is touched, no `RecipeIngredient` quantity is consumed. This is intentional (spec §21) — Sprint 2B/3+ is where Sales → Recipe Consumption → Inventory gets wired together, and doing so prematurely here would couple two foundations that need to be independently correct first.

## Alternatives Considered

A single POST accepting the full day's data as one nested payload (header + `channels[]` + `paymentMethods[]` + `categories[]` + `items[]` all at once) was considered and rejected in favor of Decision 6's individual-line-CRUD shape — the codebase's own `Recipe`/`RecipeIngredient` precedent already solves "header resource with repeatable typed child lines" this way, and reusing it avoids introducing a second, incompatible shape for the same kind of problem.

Coupling `SalesCategory` to the existing `MenuCategory` was considered and rejected (Decision 4) — the real onboarded Menu Category structure for Burger's Ink/Topo Gigio was built for the digital menu, not verified against either restaurant's actual POS category printout, and forcing the equivalence risked silently wrong category totals the moment they diverge.

Auto-reconciling channel/payment-method totals against `totalSales`/`posReportedTotal` (e.g., flagging or adjusting the smaller side to make them match) was considered and rejected (Decision 2) — this is exactly what spec §10 warns against, and reconciliation logic requires business rules (which side is authoritative? is a mismatch even an error, or a legitimate scope difference between reporting systems?) that haven't been decided and shouldn't be guessed at.

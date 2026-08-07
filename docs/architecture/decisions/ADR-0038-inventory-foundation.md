# ADR-0038 — Inventory Foundation: Branch-Scoped Stock, Append-Only Ledger

## Context

ADR-0037 drew the boundary Sprint 2A had to respect: `Ingredient`/`Unit`/`Recipe` are Restaurant-scoped product knowledge; Inventory is Branch-scoped stock, consuming that catalog without owning it. Sprint 2A builds the foundational Inventory infrastructure — current stock, opening stock, manual adjustment, waste, physical stock count, and a movement audit trail — explicitly excluding recipe-based consumption, purchasing, and costing (later sprints).

Two open questions had to be resolved before implementation: how stock quantity is calculated/stored, and how authorization should work for a Branch-scoped resource given the already-documented gap (ADR-0036/0037) that Branch-scoped-only staff (Cashier/Kitchen/Supervisor/Inventory Staff with no Restaurant/Organization membership) cannot reach the existing Restaurant-scoped Ingredient/Recipe/Supplier/Unit routes.

## Decision 1: `InventoryItem` is Branch-scoped; `StockMovement` is an append-only ledger

`InventoryItem` (`branchId`, `restaurantId` denormalized, `ingredientId`, `unitId`, `currentQuantity`, `minimumQuantity`) represents one Ingredient's stock at one Branch — `@@unique([branchId, ingredientId])` prevents duplicates. `StockMovement` (`inventoryItemId`, `branchId`/`unitId` denormalized, `type`, `quantityDelta`, `quantityAfter`, `reason`, `createdById`/`createdAt`) is a separate, append-only history table — every quantity change is a new row, never an edit or delete of a prior one.

`currentQuantity` is a maintained running balance, not purely derived by summing movements on every read: `stock-movement.repository.ts`'s `record()` writes the `StockMovement` insert and the `InventoryItem.currentQuantity` update inside one `prisma.$transaction`, and `inventory-item.repository.ts`'s `updateCurrentQuantity()` is only ever called from there. There is no code path that changes `currentQuantity` without also writing the `StockMovement` row that justifies it — the "opening stock/adjustment/waste/count must be auditable" requirement is structural, not a convention someone could forget to follow. The ledger remains the source of truth for history and is always re-derivable from if the running balance is ever suspected to have drifted.

`StockMovementType` (`OPENING_STOCK`, `ADJUSTMENT`, `WASTE`, `STOCK_COUNT`) intentionally omits `PURCHASE` and `RECIPE_CONSUMPTION` — Sprint 3 and Sprint 2B add these as purely additive enum values (`ALTER TYPE ... ADD VALUE`, the same mechanism Sprint 1.2 used to expand `TenantRole`), no redesign of the ledger shape required.

## Decision 2: Stock status is computed, never stored

`IN_STOCK` / `LOW_STOCK` / `OUT_OF_STOCK` is a pure function of `currentQuantity` vs `minimumQuantity` (`computeStockStatus()` in `inventory-item.mapper.ts`), matching the spec's own formula exactly. It is never written to the database and never recomputed differently on the frontend — the mapper is the one place it's calculated, and the API response is the frontend's only source for it. Storing it would create a second value that could silently disagree with the two quantities that define it.

## Decision 3: Authorization — Branch-scoped guard, plus a read/write TenantRole split (confirmed with the user)

`InventoryItem`/`StockMovement` are guarded by a new `createBranchScopedAccessGuard` factory in `tenant.middleware.ts` — structurally identical to the existing `createRestaurantScopedAccessGuard`, but resolving the three-tier Branch→Restaurant→Organization chain `requireBranchAccess` already implements, instead of the Restaurant-first chain the six Sprint 1.3 guards use. This is deliberate reuse, not a new authorization pattern: `requireBranchAccess` already existed and already correctly implemented this chain; Inventory is simply the first resource to denormalize `branchId` and use it via a guard, the same way `RecipeIngredient` denormalizes `restaurantId` and uses `createRestaurantScopedAccessGuard`.

Because a `BranchMember`-only user reaches tier 1 directly, Inventory routes are reachable by exactly the staff the ADR-0036/0037 gap locked out of Ingredient/Recipe/Supplier/Unit — closing that gap for this domain specifically, as `.context/current-sprint.md`'s own roadmap line anticipated ("resolve the Branch-scoped-staff Menu/Ingredient-access gap ... as part of this work"). The gap is **not** closed for Ingredient/Recipe/Supplier/Unit themselves — those routes are untouched, still Restaurant-scoped-only, per ADR-0037's own decision that this question should wait for a second real trigger before being solved generally. Inventory is that second trigger, but only for its own routes.

Reads (list/detail/movement history) require only `requireBranchAccess()`/`requireInventoryItemAccess()` — any TenantRole with branch access can view stock, matching how Ingredient/Recipe reads work today (no role restriction). Writes (opening stock, minimum-threshold update, adjustment, waste, stock count) additionally compose `requireTenantRole('OWNER', 'MANAGER', 'SUPERVISOR', 'INVENTORY_STAFF')` — the policy confirmed with the user before implementation. `CASHIER`, `KITCHEN`, `ACCOUNTANT`, and legacy `STAFF` can view inventory but not mutate it. This is the first real usage of the `INVENTORY_STAFF` `TenantRole` value, reserved in the enum since Sprint 1.2 but never consumed by any route until now.

## Decision 4: Negative stock is allowed, not clamped

An adjustment or waste entry may drive `currentQuantity` below zero. The spec doesn't dictate behavior here; clamping at zero was considered and rejected — it would silently hide a real discrepancy (e.g. a missed opening-stock entry, or stock genuinely oversold before Inventory existed) instead of surfacing it as a visible negative number a manager can investigate. `OUT_OF_STOCK` status already covers `currentQuantity <= 0`, so a negative value still displays correctly; nothing downstream assumes non-negativity.

## Decision 5: Every client-supplied `ingredientId`/`unitId` is re-verified against the branch's restaurant

Mirrors `recipe-ingredient.service.ts`'s `assertBelongsToRestaurant` exactly: `branchId` is authorized by the route guard, but `ingredientId`/`unitId` arrive in the request body and could otherwise reference rows under a different Restaurant than the one that owns the target Branch. `inventory-item.service.ts`'s `assertBelongsToRestaurant` resolves the Branch's `restaurantId` and checks both foreign keys against it before any write, throwing the new `InventoryScopeMismatchError` (400) — the same defense-in-depth posture every Sprint 1.3 resource already uses, applied to a new resource, not a new check design.

## Consequences

Positive: Inventory reuses every existing mechanism (`requireBranchAccess`'s chain logic, `requireTenantRole`, the 5-layer controller/service/repository/DTO/mapper/validator pattern, the `Decimal`-to-string-only-at-the-mapper-boundary rule) — no new architectural pattern introduced. The ADR-0036/0037 Branch-access gap is closed for the one domain that's genuinely Branch-scoped from day one, without touching the six Restaurant-scoped resources the gap still affects.

Negative, accepted for now: reading `item.currentQuantity` and computing the next movement's delta happens outside the write transaction (`stock-movement.service.ts` reads via `findById`, then `stock-movement.repository.ts`'s `record()` writes inside its own transaction using the precomputed value) — two concurrent writes to the same `InventoryItem` could theoretically race and one delta could be computed against a stale balance. Acceptable at this sprint's real scale (a restaurant manager entering data manually, not concurrent multi-user throughput); the natural fix if it ever becomes a real problem is a `SELECT ... FOR UPDATE` or optimistic version column, not built preemptively.

Negative, accepted for now: no `DELETE /inventory-items/:id` endpoint exists — not in this sprint's Definition of Done, and deleting a stock record while deciding whether to cascade or orphan its movement history is simplest to defer until a real need surfaces.

Negative, known and expected: zero `Unit` rows exist in the dev database as of this sprint (Sprint 1.4 deliberately didn't seed them) — the Inventory UI's Unit selector will be empty until the manager manually enters Units, the same pre-existing dependency `RecipeIngredient` lines already have. Sprint 2A ships the infrastructure regardless; this is a data-entry prerequisite, not an implementation gap.

## Alternatives Considered

Deriving `currentQuantity` purely by summing `StockMovement` on every read (no denormalized balance) was considered and rejected — `GET` list/detail is the most frequent operation, and an aggregate query on every read doesn't scale as movement history grows; no existing frequently-read value in this codebase is computed this way. The denormalized-balance-updated-transactionally-with-the-ledger approach was chosen instead, matching this ADR's Decision 1.

A single POST endpoint with a `type` discriminator (`OPENING_STOCK`/`ADJUSTMENT`/`WASTE`/`STOCK_COUNT`) instead of three separate write endpoints (`/adjustments`, `/waste`, `/stock-count`) was considered and rejected — the spec frames these as three distinct manager actions with different input shapes (signed delta vs. positive-only vs. absolute count) and three distinct dialogs; three explicit, independently-validated endpoints are more self-documenting and avoid discriminated-union validation complexity, at the cost of three route definitions instead of one. All three still funnel into the same `StockMovement` ledger and the same transactional write path.

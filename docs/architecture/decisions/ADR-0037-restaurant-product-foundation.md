# ADR-0037 — Restaurant Product Foundation: Domain Ownership Before Inventory

## Context

Sprint 0 (ADR-0025) and Sprint 1.1 established Restaurant-scoped Menu (`MenuCategory`/`MenuItem`) master data. Sprint 1.2 (ADR-0036) added Staff Management. The roadmap's next step is Inventory (Sprint 2+), but Inventory cannot be built correctly without first answering a prior question: what does a Restaurant sell, and what does selling it consume?

Validated against real data from both pilot restaurants — Burger's Ink's supplier order sheet (ten named suppliers, each supplying a list of named ingredients) and kitchen ingredient list, and Topo Gigio Pizzeria's ingredient list (cheeses, meats, dry goods, sauces) — before writing any code, per this sprint's explicit instruction to stop and review if the real data revealed a gap. It didn't: the model below accounts for every relationship the real sheets show, including the same ingredient ("oil") sourced from two different suppliers on Burger's Ink's own order sheet, which is direct evidence for the many-to-many Ingredient↔Supplier relationship below (not a hypothetical).

## Decision 1: Restaurant owns product knowledge; Branch will only ever own stock

`Ingredient`, `IngredientCategory`, `Supplier`, `Unit`, `Recipe`, and `RecipeIngredient` are all Restaurant-scoped, following the same ownership split ADR-0025 and `.context/restaurant.md` already established for Menu (`MenuCategory`/`MenuItem` are Restaurant-scoped; Inventory/Purchases/Expenses/Daily Closing are Branch-scoped, not yet built). This ADR makes that boundary explicit for the product layer specifically: a Restaurant's ingredient catalog, supplier relationships, and recipes are brand-level facts, true at every Branch of that Restaurant identically — a Burger's Ink location doesn't have a different definition of "what's in a Cheese Burger" than another Burger's Ink location does. Inventory (Sprint 2+) will consume this catalog per-Branch (how much of each Ingredient is on hand *here*) but will never define or own the catalog itself.

## Decision 2: Recipe is the connective foundation, not a stock-deduction engine

`Recipe` belongs to exactly one `MenuItem` (`menuItemId` unique) and owns a list of `RecipeIngredient` lines (`ingredientId`, `unitId`, `quantity`). This answers "what is consumed when this product is sold" as pure data — no stock deduction, no inventory transaction, no cost calculation happens in this sprint. That is deliberately deferred: Inventory needs this foundation to exist before it can consume it, but building the consumption logic now would be building Inventory prematurely, which this sprint's scope explicitly excludes.

## Decision 3: Unit and Ingredient Category are Restaurant-scoped configuration, not global constants

Both are modeled as ordinary Restaurant-owned tables (mirroring `MenuCategory`'s shape exactly — an `id`/`restaurantId`/`name` row), not a hardcoded enum or a platform-level shared table. This lets two restaurants with genuinely different catalogs (a burger restaurant's "Patty"/"Bun"/"Sauce" vocabulary vs. a pizzeria's "Dough"/"Topping"/"Cheese" vocabulary, both real in this sprint's validation data) each configure their own list, per this sprint's explicit "the system must not hardcode units" / "categories must be configurable" instructions, without needing a schema change to add a new one.

## Decision 4: Ingredient↔Supplier is many-to-many with no pricing yet

`IngredientSupplier` is a pure join table (`ingredientId`, `supplierId`, `assignedAt`) — no price, no lead time, no minimum order quantity. This sprint's explicit scope is "only build the relationships," deferring Purchases/Supplier Pricing to a future sprint. The many-to-many shape itself is directly evidenced by the real Burger's Ink order sheet, not speculative: "oil" appears as a line item under both J.Calleja and Schembri Ltd.

## Decision 5: Supplier-set replacement, not per-link CRUD, for managing an Ingredient's suppliers

An Ingredient's linked Suppliers are written via `supplierIds: string[]` on the same create/update call as the Ingredient itself — the full set is replaced on write, mirroring `roles.service.ts`'s existing `updateRolePermissions` pattern for `Role`↔`Permission`. This was chosen over dedicated attach/detach endpoints because the existing precedent for exactly this shape (a resource's many-to-many link set, managed as one unit) already exists in this codebase and needed no new pattern.

## Consequences

Positive: the product foundation is complete and real-data-validated before Inventory design begins, so Inventory's Sprint 2 design can assume Ingredient/Recipe/Unit/Supplier exist rather than needing to invent them under Inventory's own scope. Every new table follows an existing precedent exactly (Restaurant-scoped ownership, cascade-delete-through-hierarchy, denormalized `restaurantId` for tenant-isolation filtering, defense-in-depth scope-mismatch checks on every client-supplied foreign key) — no new architectural pattern was introduced.

Negative, accepted for now: `Ingredient`/`Unit` deletion cascades through to any `RecipeIngredient` lines referencing them (same cascade-through-hierarchy convention `MenuCategory`→`MenuItem` already uses), which means deleting a widely-used Ingredient or Unit silently removes it from every recipe that referenced it, with no confirmation of blast radius shown to the user. This mirrors an accepted risk already present in `MenuCategory` deletion (cascades to `MenuItem`) and is not a new risk category this sprint introduces — flagged here rather than solved, since building a "used by N recipes" warning is a UI-polish concern, not a data-model gap.

## Alternatives Considered

A single `productUnit` field directly on `Ingredient` (a "default unit of measure") was considered and rejected — the sprint's own worked example (`Recipe → Ingredient → Quantity → Unit`) places Unit on the *recipe line*, not the ingredient master record, and Burger's Ink's real data shows the same ingredient bought in one unit (e.g. a 1kg bag) but potentially used in another (grams) — collapsing these into one field on `Ingredient` would misrepresent that distinction. Deferred, not solved: a future Inventory/Purchasing sprint may need a distinct "purchase unit" concept once stock and purchasing exist; nothing in this sprint's schema forecloses adding it then.

Pricing on `IngredientSupplier` now, instead of a later `SupplierPrice` table, was rejected — explicitly out of scope ("Do NOT implement supplier pricing yet"), and adding it now would be speculative given Purchases doesn't exist yet to consume it.

A capability-matrix-style split of Menu "read" vs. "write" access for Branch-scoped-only staff (the gap ADR-0036 already flagged) was considered as part of this sprint, since Recipe/Ingredient routes have the identical shape to Menu's. Rejected — same reasoning ADR-0036 gave: this is exactly the kind of finer-than-role-list capability question that should wait for a second real trigger, not be solved reactively while building an unrelated feature. The gap is inherited unchanged: Branch-scoped-only staff (Cashier/Kitchen/Inventory Staff) cannot reach Ingredient/Recipe/Supplier/Unit routes either, for the same reason they can't reach Menu routes (`requireRestaurantAccess` doesn't consider `BranchMember`).

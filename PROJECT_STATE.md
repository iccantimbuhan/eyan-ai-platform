# Project State

_Last updated: 2026-08-06 (Restaurant Operations Platform — Sprint 1.3) by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

**Restaurant Operations Platform — Sprint 1.3 (Restaurant Product Foundation) — implemented and tested against the isolated dev database (`eyan_ai_platform_dev`); NOT yet deployed to production.** Completes the product-knowledge layer Inventory (Sprint 2+) will need but must never own: `Ingredient`, `IngredientCategory`, `Supplier`, `Unit`, `Recipe`, `RecipeIngredient` (ADR-0037) — all Restaurant-scoped, the same ownership split Menu already established, since a restaurant's ingredient catalog and recipes are brand-level facts true at every Branch identically.

Domain model validated against real data from both pilot restaurants (Burger's Ink's supplier order sheet + kitchen ingredient list, Topo Gigio Pizzeria's ingredient list) *before* implementation, per this sprint's explicit "stop and produce an Architecture Review if a gap is found" instruction — none was found. The real data directly evidenced the many-to-many Ingredient↔Supplier relationship the schema needed: Burger's Ink's own order sheet lists "oil" under two different suppliers (J.Calleja and Schembri Ltd).

Full CRUD for all six resources, following Sprint 1.1's exact layering (route → validation → tenant-access guard → controller → service → repository → Prisma). All six tenant-access guards (`requireUnitAccess`/`requireIngredientCategoryAccess`/`requireSupplierAccess`/`requireIngredientAccess`/`requireRecipeAccess`/`requireRecipeIngredientAccess`) share one new `createRestaurantScopedAccessGuard` factory in `tenant.middleware.ts` — all six resources denormalize `restaurantId` directly onto the row (same posture as `MenuItem`), so the guard logic is identical across all of them; factored out rather than copy-pasted six times, per the sprint's "no duplicated logic" requirement. Defense-in-depth scope-mismatch checks (`RestaurantProductScopeMismatchError`) guard every client-supplied foreign key — `ingredientCategoryId`, `supplierIds`, `menuItemId` (Recipe), `ingredientId`/`unitId` (RecipeIngredient) — mirroring Sprint 1.1's `MenuCategoryMismatchError` pattern exactly. An Ingredient's linked Suppliers are written as a full-set replace on the same create/update call (`supplierIds: string[]`), mirroring `roles.service.ts`'s existing `updateRolePermissions` pattern rather than introducing attach/detach endpoints. `Recipe.menuItemId` is unique (one recipe per menu item), pre-checked at the service layer (`MenuItemAlreadyHasRecipeError`) for a clean 409 instead of a raw DB constraint error. Recipe is data-only this sprint — no stock deduction, no Inventory linkage.

Verified: 62 new backend tests (6 resource service test files covering CRUD + every scope-mismatch defense; a shared test generator covering all 6 new middleware guards' direct-access/org-fallback/cross-tenant-403/404 cases) — full backend suite 1024/1024 passing. Live end-to-end smoke test against the dev database using the real supplier/ingredient names from both restaurants: created Units/Ingredient Categories/Suppliers, created an "Oil" ingredient linked to two real suppliers, built a Recipe for a menu item ("Ultimate Cheese Burger") with a "20g Lettuce" recipe-ingredient line, confirmed a duplicate ingredient-on-recipe correctly 409s, and confirmed cross-tenant scope-mismatch defenses correctly reject a Topo Gigio ingredient/supplier being attached to a Burger's Ink recipe/ingredient (400) as well as a demo user with no restaurant membership being denied entirely (403). All test data cleaned up afterward. Frontend: 6 new pages (Units, Ingredient Categories, Suppliers, Ingredients — with a category select + supplier checkbox multi-select, Recipes — with an ingredient-line management dialog) joining the sidebar's Restaurant Operations group; clean typecheck/build, `eslint` clean (same pre-existing React Compiler warning pattern already present elsewhere, not new), all 421 tests pass.

**Known gap, inherited unchanged from Sprint 1.2, deferred to Sprint 2**: Branch-scoped-only staff (Cashier/Kitchen/Inventory Staff) cannot reach Menu *or* the new Ingredient/Recipe/Supplier/Unit routes — none of the tenant-access guards consider `BranchMember`. Fixing this needs a read/write access split, out of scope for both Sprint 1.2 and Sprint 1.3.

Production has **not** been touched — Sprint 1.1's, 1.2's, and 1.3's migrations and code are all committed, ready to promote together through the unchanged `deploy.sh` pipeline whenever approved. Full architecture package + the pre-Sprint-1.2 architecture review: `/home/eyancantimbuhan/.claude/plans/restaurant-operations-platform-rustling-wirth.md`.

**Also complete — Restaurant Operations Platform Sprint 0 (Tenancy Foundation) — deployed and verified in production.** `Organization → Restaurant → Branch`, `OrganizationMember`/`RestaurantMember` junctions, `requireRestaurantAccess`/`requireBranchAccess` middleware, a Module Registry (`OrganizationModule`), `GET /api/v1/organizations/me`, a rewritten `TeamSwitcher`. A post-deploy bootstrap-seeding gap (ADR-0035) was found and fixed — see `tasks/completed/` for the full account.

**Also complete — Restaurant Operations Platform Sprint 1.1 (Restaurant Master Data Foundation) and Sprint 1.2 (Customer-Facing Authorization & Staff Management)** — both validated against the dev database, not yet deployed. Sprint 1.1: Restaurant/Branch/Menu Category/Menu Item CRUD, `requireOrganizationAccess`/`requireMenuCategoryAccess`/`requireMenuItemAccess`, `MenuCategoryMismatchError`. Sprint 1.2: `Restaurant Customer` platform Role, expanded `TenantRole`, `BranchMember`, `requireTenantRole`, Staff Management — see ADR-0036.

**Also complete — Production Stabilization (Sprint 5.2) — COMPLETE** (unrelated track). Sprint 5.1 shipped the full CRM AI-qualification pipeline but it had never actually completed successfully in production. Root cause traced entirely from n8n's own execution history: `buyingIntent`/`urgency`/`riskLevel`'s CRM write-back validator only accepted `LOW/MEDIUM/HIGH`, but a real model legitimately answers `"UNKNOWN"` when unsure — every such qualification 400'd and stranded the lead at `VALIDATED`. Fixed by accepting `"UNKNOWN"` at the validator and normalizing it to `null` before the Prisma write. A second bug found only during live validation: Workflow 4's Slack/Email steps referenced `$json`, overwritten by `Assign Salesperson`'s own HTTP response on the real path — fixed by referencing `$('Verify & Parse').item.json` explicitly. `app.set("trust proxy", 1)` was also fixed (unrelated `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`). Verified live four times. Full report: `tasks/completed/sprint-5-2-production-stabilization.md`.

---

## Pointers

- Condensed current-sprint summary for AI assistants: `.context/current-sprint.md`
- Full sprint-by-sprint history (30 sprints): `tasks/completed/`
- Architecture decisions: `docs/architecture/decisions/`
- Release history: `CHANGELOG.md`

_Historical entries previously kept in this file were removed 2026-08-04 (Documentation Optimization Sprint 3) — each one already has a complete, unabridged counterpart in `tasks/completed/`; nothing was lost. This file now matches the "current state only" scope its own header has always claimed._

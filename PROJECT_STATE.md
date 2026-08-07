# Project State

_Last updated: 2026-08-07 (Restaurant Operations Platform — Sprint 2A) by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

**Restaurant Operations Platform — Sprint 2A (Inventory Foundation) — COMPLETE.** Branch-scoped current stock, opening stock, manual adjustment, waste, physical stock count, and a full movement audit trail, built on the Sprint 1.3 product catalog without modifying it (ADR-0037's boundary respected). New Prisma models `InventoryItem` (`@@unique([branchId, ingredientId])`) and `StockMovement` (append-only ledger: `OPENING_STOCK`/`ADJUSTMENT`/`WASTE`/`STOCK_COUNT`). `currentQuantity` is a running balance updated only transactionally alongside its justifying `StockMovement` row — structurally impossible to mutate without an audit entry. Stock status (`IN_STOCK`/`LOW_STOCK`/`OUT_OF_STOCK`) is computed server-side on every read, never stored. See ADR-0038.

A new `createBranchScopedAccessGuard` factory (`requireInventoryItemAccess`) closes the ADR-0036/0037-documented Branch-scoped-staff access gap **for Inventory specifically** (Ingredient/Recipe/Supplier/Unit routes are unchanged and still affected). Reads are open to any branch role; writes require `requireTenantRole('OWNER', 'MANAGER', 'SUPERVISOR', 'INVENTORY_STAFF')` — confirmed with the user before implementation, the first real usage of the `INVENTORY_STAFF` role. Every client-supplied `ingredientId`/`unitId` is re-verified against the branch's restaurant before write.

Frontend: a new Inventory page (Branch `<Select>`, a table with computed status badges, five dialogs, a movement-history panel), following every existing restaurant-ops convention exactly. `useActiveTenant()` extended to resolve `branchId`/`branches` (state that existed since Sprint 0 but was never surfaced to pages).

Verified: 1058/1058 backend tests pass (34 new), 422/422 frontend tests pass (4 new), both typecheck clean, frontend build succeeds. Live smoke test against the dev database (real HTTP/JWTs, temporary data cleaned up afterward) confirmed correct running-balance math end to end, duplicate/cross-restaurant/unauthenticated rejection, and a real `BranchMember`-only CASHIER account correctly reading but being denied every write action. Sprint 1.4's real onboarded data confirmed untouched. Explicitly not built (Sprint 2B/3+): recipe-based automatic stock consumption, purchases, costing, `DELETE /inventory-items/:id`.

**Also complete — Sprint 1.3.1 (Content Studio Authorization Hardening, unrelated to Restaurant Operations).** Fixed Content Studio's sidebar/route/API having no permission gating at all (every authenticated user, including `Restaurant Customer`, could see and call it) — gated on the existing `'dashboard'` permission at all three layers. Verified live that adding `moduleKey` (as initially instructed) would have hidden Content Studio platform-wide, since no `OrganizationModule` row for it exists; deviated from the literal instruction with that verification documented.

**Also complete — Restaurant Operations Platform Sprint 1.4 (Restaurant Data Onboarding).** Real Burger's Ink (94 Ingredients, 17 Suppliers, 36 Recipes, 62 Menu Items) and Topo Gigio (55 Ingredients, 0 Suppliers, 32 Recipes, 32 Menu Items) master data seeded into the dev database via one idempotent, manually-run script — not part of `bootstrap.ts`'s automatic chain. Zero `Unit`/`RecipeIngredient` rows, by design (deferred to manual UI entry). Full account: `tasks/completed/`.

**Also complete — Restaurant Operations Platform Sprint 0 (Tenancy Foundation) — deployed and verified in production.** `Organization → Restaurant → Branch`, `OrganizationMember`/`RestaurantMember` junctions, `requireRestaurantAccess`/`requireBranchAccess` middleware, a Module Registry (`OrganizationModule`), `GET /api/v1/organizations/me`, a rewritten `TeamSwitcher`. A post-deploy bootstrap-seeding gap (ADR-0035) was found and fixed — see `tasks/completed/` for the full account.

**Also complete — Restaurant Operations Platform Sprint 1.1 (Restaurant Master Data Foundation), Sprint 1.2 (Customer-Facing Authorization & Staff Management), and Sprint 1.3 (Restaurant Product Foundation)** — all validated against the dev database, not yet deployed. Sprint 1.1: Restaurant/Branch/Menu Category/Menu Item CRUD, `requireOrganizationAccess`/`requireMenuCategoryAccess`/`requireMenuItemAccess`, `MenuCategoryMismatchError`. Sprint 1.2: `Restaurant Customer` platform Role, expanded `TenantRole`, `BranchMember`, `requireTenantRole`, Staff Management — see ADR-0036. Sprint 1.3: Ingredient/IngredientCategory/Supplier/Unit/Recipe/RecipeIngredient CRUD, all Restaurant-scoped — see ADR-0037.

**Also complete — Production Stabilization (Sprint 5.2) — COMPLETE** (unrelated track). Sprint 5.1 shipped the full CRM AI-qualification pipeline but it had never actually completed successfully in production. Root cause traced entirely from n8n's own execution history: `buyingIntent`/`urgency`/`riskLevel`'s CRM write-back validator only accepted `LOW/MEDIUM/HIGH`, but a real model legitimately answers `"UNKNOWN"` when unsure — every such qualification 400'd and stranded the lead at `VALIDATED`. Fixed by accepting `"UNKNOWN"` at the validator and normalizing it to `null` before the Prisma write. A second bug found only during live validation: Workflow 4's Slack/Email steps referenced `$json`, overwritten by `Assign Salesperson`'s own HTTP response on the real path — fixed by referencing `$('Verify & Parse').item.json` explicitly. `app.set("trust proxy", 1)` was also fixed (unrelated `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`). Verified live four times. Full report: `tasks/completed/sprint-5-2-production-stabilization.md`.

---

## Pointers

- Condensed current-sprint summary for AI assistants: `.context/current-sprint.md`
- Full sprint-by-sprint history (30 sprints): `tasks/completed/`
- Architecture decisions: `docs/architecture/decisions/`
- Release history: `CHANGELOG.md`

_Historical entries previously kept in this file were removed 2026-08-04 (Documentation Optimization Sprint 3) — each one already has a complete, unabridged counterpart in `tasks/completed/`; nothing was lost. This file now matches the "current state only" scope its own header has always claimed._

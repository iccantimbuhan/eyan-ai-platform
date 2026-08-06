# Project State

_Last updated: 2026-08-06 (Restaurant Operations Platform — Sprint 1.4) by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

**Restaurant Operations Platform — Sprint 1.4 (Restaurant Data Onboarding) — COMPLETE.** A data-only sprint, no code or architecture changes — populated the isolated dev database (`eyan_ai_platform_dev`) with the real Burger's Ink and Topo Gigio Pizzeria master data (menus, ingredients, suppliers, recipes) so Sprint 2 (Inventory) can begin against production-shaped data. Source: real photographed menus + Burger's Ink's real supplier order sheet (`/home/eyancantimbuhan/Data Photos/`, outside the repo, not committed) plus a manually-provided, pre-normalized Topo Gigio ingredient list.

One idempotent script, `backend/prisma/seed-restaurant-product-onboarding.ts` (find-by-`(restaurantId, name)`-then-create, matching `seed-restaurant-tenancy.ts`'s existing pattern; run manually via `npx tsx`, deliberately not wired into `bootstrap.ts`'s automatic deploy chain since this is real customer data, not platform scaffolding), populated: **Burger's Ink** — 7 Menu Categories, 62 Menu Items (verbatim from the real menu, full ingredient descriptions preserved where printed), 9 Ingredient Categories, 94 Ingredients, 17 Suppliers, 88 Ingredient↔Supplier links (including real evidence of one ingredient with 3 suppliers — "Frying Oil" from 360 Food, Schembri Ltd, and J.Calleja), 36 Recipes. **Topo Gigio Pizzeria** — 5 Menu Categories, 32 Menu Items (all with real descriptions), 6 Ingredient Categories, 55 Ingredients (the exact provided list), 0 Suppliers (none were provided — real gap, not an oversight), 32 Recipes.

**Zero `Unit` and zero `RecipeIngredient` rows exist, by design** — this sprint's explicit instruction was "do not seed Units, they're entered manually through the UI," and since `RecipeIngredient.unitId` is a required foreign key, no ingredient line can exist until a Unit does; the instruction to "never guess a quantity" ruled out working around this anyway. Every seeded Recipe's `notes` field records this explicitly. Populating `RecipeIngredient` rows for all 68 Recipes is the largest piece of remaining manual work before Sprint 2.

Verified: the seed script is idempotent (a second run created zero duplicate rows); SQL checks confirmed zero duplicate menu items/ingredients/suppliers within either restaurant, zero cross-restaurant `IngredientSupplier` links, zero `Recipe`↔`MenuItem` restaurant mismatches; a live check against the real HTTP API (not just SQL) confirmed the data renders correctly end-to-end through the exact layers Sprints 1.1–1.3 built.

Full onboarding process documented in `.context/restaurant.md`'s new "Restaurant Onboarding Workflow" section, intended to be followed for any future restaurant, ahead of the eventual OCR/AI-assisted importer (explicitly deferred to a post-Inventory sprint).

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

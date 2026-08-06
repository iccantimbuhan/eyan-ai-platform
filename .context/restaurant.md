# Restaurant Operations

Single responsibility: the Restaurant Operations module — the platform's first commercial, multi-tenant business module — file locations, tenancy model, and rules unique to this domain.

## Status

Sprint 0 (tenancy foundation) complete **and deployed and verified in production** (2026-08-06). No Restaurant business features exist yet — no Menu, Ingredients, Suppliers, Inventory, Purchases, Expenses, Daily Closing, Sales, or Reports. The sidebar's "Restaurant Operations" entry points at a placeholder (`ComingSoon`) dashboard only. See ADR-0025, ADR-0026.

A post-deploy gap (bootstrap seed data never reached production — see ADR-0035) briefly left the sidebar item hidden after the initial Sprint 0 deploy; resolved by splitting seed data into an automated `bootstrap.ts` (platform-required) vs. a manual `seed.ts` (demo/sample) and running the former against production. `deploy.sh` now runs it on every future deploy automatically.

## Tenant hierarchy

`Organization → Restaurant → Branch`. `Organization` is the one reusable tenant/membership/billing root (a future non-restaurant module would hang off the same primitive). `Restaurant` (a brand, e.g. Burger's Ink) and `Branch` (a physical location) are this module's own domain vocabulary beneath it — not platform-level. All future Restaurant business data will be **Branch-scoped**, required, no exceptions.

## Membership

`OrganizationMember(userId, organizationId, role)` grants access to every Restaurant (and transitively every Branch) under the Organization. `RestaurantMember(userId, restaurantId, role)` scopes a user to just that one Restaurant, never its siblings. `role` is `TenantRole` (`OWNER`/`MANAGER`/`STAFF`) — a distinct namespace from the platform's global `Role`/`Permission` tables, which are untouched by this module. Branch-level membership is not modeled (YAGNI).

Bootstrap seeding (`seed-restaurant-tenancy.ts`) grants `OrganizationMember(OWNER)` to every user who already holds the platform's global `Owner` role — not a hardcoded email, not a placeholder account. Onboarding a real second/third user onto the Organization is Sprint 1's admin UI, not this script.

## Files

- Tenancy foundation (Sprint 0): `backend/src/{controllers,services,repositories}/organization*`, `restaurant.repository.ts`, `restaurant-member.repository.ts`, `branch.repository.ts`, `organization-module.repository.ts`, `backend/src/middleware/tenant.middleware.ts`, `backend/src/config/module-registry.ts`, `backend/src/services/module-registry.service.ts`.
- Bootstrap seeding: `backend/prisma/bootstrap.ts` (platform-required, automated in `deploy.sh`), `backend/prisma/seed-restaurant-tenancy.ts` (Organization/Restaurant/Branch/OrganizationModule/OrganizationMember, called by both `bootstrap.ts` and `seed.ts`) — see ADR-0035 and `deployment.md`.
- Frontend tenancy: `frontend/src/features/organizations/`, `frontend/src/stores/tenant-store.ts`, `frontend/src/components/layout/team-switcher.tsx`.
- Restaurant business logic (Sprint 1+, not built yet): will follow the `restaurant-*` domain prefix, mirroring `finance-*`/`crm-*` exactly, under the same `backend/src/{controllers,services,repositories}/` folders.
- Frontend feature: `frontend/src/features/restaurant-ops/` (currently just a placeholder dashboard page).

## Rules

- **Every Restaurant repository query must filter by `branchId`/`restaurantId` — no exceptions.** This is the opposite of Finance/CRM's precedent (`.context/finance.md`, `.context/crm.md`): those are deliberately global shared workspaces with no per-row filtering. Restaurant Operations is the platform's first genuinely multi-tenant module — copying the Finance/CRM pattern here is a real security bug, not a style choice.
- `requirePermission("restaurant")` gates *whether* a user can use the module at all; `requireRestaurantAccess`/`requireBranchAccess` (`tenant.middleware.ts`) gate *which* Restaurant/Branch they can act on within it. Compose both on every Restaurant-scoped route, the same way Finance/CRM already stack `authenticate` + `requirePermission`.
- The Module Registry (`OrganizationModule`, gated via `useModuleEnabled()` on the frontend) controls nav/route *visibility* only. It is never the real enforcement — `requirePermission`/`requireRestaurantAccess`/`requireBranchAccess` are.
- Do not reuse `Finance.Expense` for restaurant expenses when that module ships (Sprint 3) — same word, unrelated domain and tenancy model. Do not route Slack (Sprint 7) through `eyan-automation-hub` — see ADR-0034.

## Decisions

ADR-0025 (Multi-Tenancy Foundation), ADR-0026 (Module Foundation & Module Registry), ADR-0035 (Deployment Bootstrap Strategy) — implemented, Sprint 0. ADR-0032 (Daily Closing Workflow), ADR-0033 (Data Ingestion Architecture), ADR-0034 (Automation & Communication Layer) — proposed, not yet implemented; see `docs/architecture/decisions/`.

# ADR-0025 — Restaurant Operations Platform: Multi-Tenancy Foundation

## Context

Restaurant Operations is the platform's first commercial, multi-tenant business module — a manager runs two real restaurant brands (Burger's Ink, Topo Gigio Pizzeria) today, and future customers will each be their own tenant. No multi-tenancy exists anywhere in this codebase before this ADR: `Lead.organizationId`, `AiBrain.organizationId`, and `Expense`/`RecurringExpenseTemplate`/`Budget.householdId` are plain nullable strings, explicitly commented "future-proofing only, unused today" — no FK, no index, nothing reads or writes them. Finance and CRM are deliberately global, permission-gated, shared workspaces (a documented decision, not an oversight) — this ADR does not touch that; it is new infrastructure for Restaurant Operations, not a retrofit of Finance/CRM.

## Decision 1: Shared schema, tenant-scoping columns — not schema- or database-per-tenant

One Postgres database, one Prisma schema, consistent with the platform's existing single-schema posture and its scale (two restaurants today, a handful of commercial customers next). Every future Restaurant business table will carry a required `branchId`, plus a denormalized `restaurantId` for cheap tenant-scoped indexing without an extra join on every read.

## Decision 2: Organization → Restaurant → Branch, confirmed hierarchy

`Organization` is the one reusable tenant/membership/billing root — the primitive a future non-restaurant module (Retail, Salon, ...) would also hang off of. `Restaurant` and `Branch` are this module's own domain vocabulary beneath it; a future module defines its own children under `Organization` rather than reusing these two. No Branch business data exists yet (Inventory, Purchases, Expenses, Daily Closing, Sales, Reports) — this migration is tenancy foundation only.

Models added: `Organization`, `Restaurant` (`organizationId` FK), `Branch` (`restaurantId` FK). All `id String @default(cuid())`, matching the schema's existing convention.

## Decision 3: Membership, not row-ownership — two junction tables, same shape as `UserRole`

`OrganizationMember(userId, organizationId, role)` grants access to every Restaurant (and transitively every Branch) under that Organization. `RestaurantMember(userId, restaurantId, role)` scopes a user to one Restaurant without granting its siblings under the same Organization. Both are composite-keyed junctions with no separate `id` column, identical in shape to the existing `UserRole` table. `role` is a new `TenantRole` enum (`OWNER`, `MANAGER`, `STAFF`) — a distinct namespace from the platform's existing global `Role`/`Permission` tables (Owner/Admin/Developer/QA Engineer/Viewer), which stay untouched. Branch-level membership is deliberately not modeled (YAGNI) — access derives from Restaurant/Organization membership until a real customer needs per-location staff restriction.

## Decision 4: Authorization composes with existing RBAC, doesn't replace it

`requireRestaurantAccess(paramName)` / `requireBranchAccess(paramName)` (`backend/src/middleware/tenant.middleware.ts`) check a route param's target against the requesting user's `restaurantMemberships`/`organizationMemberships`, falling back to a DB lookup of the target's parent chain when there's no direct membership. These compose alongside `requirePermission` exactly the way every existing route already stacks `authenticate` + `requirePermission` — `requirePermission("restaurant")` gates whether a user can use the module at all; `requireRestaurantAccess`/`requireBranchAccess` gate *which* Restaurant/Branch within it.

## Decision 5: Tenant context loads in the same query as roles/permissions — no JWT redesign

`organizationMemberships`/`restaurantMemberships` were added to `userWithRolesInclude` (`backend/src/repositories/user.repository.ts`), the one shared Prisma include every user-loading method already uses. `authenticate` (`backend/src/middleware/auth.middleware.ts`) required **zero code changes** — it already calls `userRepository.findById()`, so the new memberships arrive for free in `req.user`, typed via the matching update to `AuthenticatedUser` in `backend/src/types/express.d.ts`. The JWT payload (`{userId, email}`) is unchanged.

## Consequences

Positive:
- Multi-tenancy is additive-only — no existing table, route, or JWT shape changed. `pnpm test` (909 tests) and `tsc --noEmit` both pass unchanged.
- The membership model generalizes to a future commercial customer with one Organization, N Restaurants, N Branches without a schema change.
- `Organization` is genuinely reusable by a future non-restaurant module; `Restaurant`/`Branch` are not forced to be generic.

Negative:
- Every future Restaurant repository must remember to filter by `branchId`/`restaurantId` — the opposite of Finance/CRM's existing "shared workspace, no row filtering" precedent. This mismatch is the single highest-risk footgun for whoever builds the next Restaurant sprint; flagged explicitly in `.context/restaurant.md`.
- `requireRestaurantAccess`/`requireBranchAccess` add up to two extra DB round-trips per request when the user has no direct membership (falls back to looking up the parent chain) — acceptable at current scale, worth revisiting only if it shows up in real latency data.

## Alternatives Considered

1. Schema-per-tenant or database-per-tenant isolation — rejected as unnecessary infrastructure at this scale (two restaurants today), and inconsistent with the platform's single-schema/single-Prisma-client posture.
2. Restaurant *is* the tenant (two-level `Restaurant → Branch`, no `Organization`) — rejected; doesn't fit "one manager runs both restaurants" today without a separate cross-tenant-access mechanism, and doesn't generalize to a future customer owning multiple brands.
3. Reusing the existing global `Role`/`Permission` tables for tenant roles — rejected; conflates "who can administer the SaaS platform" with "who can run this specific restaurant," a real conceptual collision (e.g. a platform "Owner" role vs. a restaurant "Owner" membership role meaning different things).
4. Branch-level membership (`BranchMember`) from day one — rejected as YAGNI; no real customer need for per-location staff restriction exists yet, and Restaurant-level membership already implies branch access.

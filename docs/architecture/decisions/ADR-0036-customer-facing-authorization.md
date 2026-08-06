# ADR-0036 — Customer-Facing Authorization: Platform RBAC vs. Tenant Role Capabilities

## Context

Sprint 0 (ADR-0025) introduced `Organization → Restaurant → Branch` multi-tenancy and `OrganizationMember`/`RestaurantMember`, but authorization only ever checked whether a membership row *existed* — the `TenantRole` (`OWNER`/`MANAGER`/`STAFF`) stored on each row was written on every upsert and never read by any check. Sprint 1.1 added Restaurant/Branch/Menu Category/Menu Item CRUD on the same "any membership grants full access" model.

The product direction sharpened after Sprint 1.1: Burger's Ink becomes the first paying commercial customer of "Eyan Restaurant OS." Customer users must never see AI Core, CRM, Finance, Content Studio, or Platform Administration — only Restaurant Operations, and only the parts their role covers (Restaurant Owner, Restaurant Manager, Supervisor, Cashier, Kitchen, Inventory Staff, Accountant). A dedicated architecture review (conducted before this sprint, see the plan file's "Architecture Review — Customer-Facing Authorization Model" section) confirmed this splits into two independent concerns that must never be conflated:

- **Platform RBAC** answers "what platform modules can this user access at all" — existing, global, five internal Roles (Owner/Admin/Developer/QA Engineer/Viewer), untouched by this ADR.
- **Tenant Role** answers "what can this user do inside a Restaurant" — Sprint 0's `TenantRole`, extended here to actually mean something.

## Decision 1: One new platform Role, granted only the `restaurant` permission

`Restaurant Customer` is added to `bootstrap.ts`'s seeded roles, granted exactly one Permission (`restaurant`), in a grant loop deliberately separate from the existing "Owner gets every permission" loop. Every commercial customer user gets this Role and this Role only — `useCan()`/`useModuleEnabled()` need zero code changes, since a user whose only Role grants `restaurant` already can't see any other module's nav, by the exact mechanism every other module already uses. This is purely additive: the five existing internal Roles, their permissions, and every existing user's access are completely unaffected.

## Decision 2: `TenantRole` expands to the seven named roles; `STAFF` stays but is retired

`TenantRole` gains `SUPERVISOR`, `CASHIER`, `KITCHEN`, `INVENTORY_STAFF`, `ACCOUNTANT` alongside the existing `OWNER`/`MANAGER`/`STAFF`. `STAFF` is kept — Postgres cannot cleanly drop an enum value — but no code path assigns it going forward; `staff-membership.validator.ts` structurally excludes it from the assignable set. Verified before migrating: zero `MANAGER` or `STAFF` rows existed in either database, so this required no data backfill.

## Decision 3: `BranchMember` — the real need ADR-0025 deferred on

ADR-0025 deliberately left Branch-level membership unmodeled: "access is derived from Restaurant/Organization membership until a real customer needs per-location staff restriction." Sprint 1.2's Staff Management (`Assign Branch`, a required deliverable) is that real need. `BranchMember` is added, structurally identical to `RestaurantMember` (composite PK, `role TenantRole`, `assignedAt`), with the corresponding relation on `User`/`Branch` and inclusion in `AuthenticatedUser`. This amends, not reverses, ADR-0025's YAGNI call — the condition it named for building this has occurred.

## Decision 4: `requireTenantRole`, composed after the existing tenant-access guards, reads data already in memory

`requireTenantRole(...roles: TenantRole[])` in `tenant.middleware.ts` mirrors `requirePermission(...permissions: string[])`'s exact "any of these" shape. It never queries the database: `requireOrganizationAccess`/`requireRestaurantAccess`/`requireBranchAccess`/`requireMenuCategoryAccess`/`requireMenuItemAccess` now populate `req.tenantContext` (`{ organizationId?, restaurantId?, branchId? }`) as they resolve access, and `requireTenantRole` resolves the caller's effective role from `req.tenantContext` plus `req.user`'s already-loaded `organizationMemberships`/`restaurantMemberships`/`branchMemberships` arrays — the same arrays `authenticate()` has loaded on every request since Sprint 0.

Precedence is most-specific-wins: a direct `BranchMember` role is used if present, otherwise the `RestaurantMember` role for the resolved restaurant, otherwise the `OrganizationMember` role for the resolved organization. This is the same precedence `hasDirectRestaurantAccess`/`hasOrganizationAccess` already used for existence checks, extended to carry a role forward instead of a boolean. `requireTenantRole` fails closed: composed without a prior tenant-access guard (no `req.tenantContext`), it always denies.

`requireTenantRole` replaces nothing — every existing route's behavior is unchanged unless a Sprint 1.2 route explicitly adds it. Its first real usage is Staff Management: `requireTenantRole('OWNER', 'MANAGER')` gates every staff endpoint.

## Decision 5: Staff Management is an upsert over three membership tables, not a fourth table

"Invite Staff," "Assign Tenant Role," "Assign Restaurant," and "Assign Branch" are the same operation — an upsert differing only in which scope is targeted — so `StaffMembershipService.upsertMembership()` serves all four. Inviting a brand-new email creates a `User` (granting `Restaurant Customer` additively — an existing user's broader platform Role, if any, is never touched) and requires a name/password, since no email-invite channel exists yet (ADR-0034 already deferred Email). Inviting an *existing* email just adds or updates a membership grant — a legitimate use of the existing multi-membership model, not a bug (`.context/restaurant.md`'s `RestaurantMember` scoping note already established this). "Disable Staff" hard-deletes every membership row the user holds under that Organization, rather than reusing `User.isActive` — that flag is global and would incorrectly lock a multi-tenant user out of every other Organization they belong to. Removal takes effect on the user's very next request, since `authenticate()` reloads memberships fresh every time.

A client-supplied `restaurantId`/`branchId` is never trusted without re-verifying it belongs to the already-authorized parent scope (`StaffScopeMismatchError`) — the same defense-in-depth pattern Sprint 1.1 established for `MenuItem.menuCategoryId` (`MenuCategoryMismatchError`).

Two route surfaces exist: `/organizations/:organizationId/staff` (Organization-wide, `requireOrganizationAccess`) and `/restaurants/:restaurantId/staff` (`requireRestaurantAccess`) — the latter exists specifically so a Restaurant-scoped-only Manager (`RestaurantMember`, no `OrganizationMember`) isn't locked out of managing their own restaurant's staff. The restaurant-scoped route can only ever grant `RESTAURANT` or `BRANCH` scope, never `ORGANIZATION` — that requires the strictly stronger guard.

## Consequences

Positive: platform RBAC needed zero structural changes (one new Role row); `requireTenantRole` reuses data already loaded, no new query cost; `BranchMember` follows an established pattern exactly; Staff Management reuses three existing repositories rather than introducing new tenancy infrastructure.

Negative, accepted for now: Branch-scoped-only staff (Cashier/Kitchen/Inventory Staff) cannot reach Sprint 1.1's Menu Category/Item routes at all today, because those are gated by `requireRestaurantAccess`, which doesn't consider `BranchMember`. This is a real, newly-surfaced gap (it couldn't previously occur — `BranchMember` didn't exist), not a defect in what this ADR delivers; fixing it correctly means deciding whether Menu *read* access should be split from Menu *write* access, which is exactly the finer-grained-than-role-list capability question the prior architecture review named as the trigger for a future capability matrix. Deferred to Sprint 2, since this sprint's own scope explicitly excluded Menu changes.

## Alternatives Considered

A `TenantPermission`/`TenantRolePermission` capability-matrix table (mirroring `Role`/`Permission`/`RolePermission` exactly, but for tenant roles) was considered and rejected for now — the seven named roles are a fixed, platform-defined set today, not customer-customizable, so a role-list check (`requireTenantRole('OWNER','MANAGER')`) is sufficient and simpler. `requireTenantRole`'s design keeps this migration path open deliberately: it already resolves one canonical "effective role" value per request the same way a capability lookup eventually would, so swapping the enum comparison for a database-backed capability lookup later is a contained change inside `resolveEffectiveTenantRole`, not a redesign of the calling convention on any route. Building the full three-table system now was rejected as premature — no second real need for customer-defined roles exists yet.

Reusing `User.isActive` for "Disable Staff" was rejected — see Decision 5.

A hardcoded hierarchy where `BranchMember` inherits from `RestaurantMember` inherits from `OrganizationMember` via database foreign keys (rather than three independent tables resolved by precedence in application code) was rejected as unnecessary complexity — the existing `OrganizationMember`/`RestaurantMember` independence (Sprint 0) already proved the simpler model works.

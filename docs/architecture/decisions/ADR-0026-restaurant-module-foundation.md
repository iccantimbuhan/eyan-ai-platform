# ADR-0026 — Restaurant Operations Module Foundation & Module Registry

## Context

Restaurant Operations must become a new business module following the exact same conventions as Finance and CRM (layer-first backend, domain-prefixed files; feature-first frontend), and the platform needs a way to enable an *existing* module for a new commercial Organization without a code change or deploy — distinct from adding a genuinely *new* module (e.g. a future Retail module), which still requires code, same as it always has.

## Decision 1: Restaurant Operations follows the existing layer-first, domain-prefixed backend convention — no feature-module rewrite

ADR-0023 proposed a feature-module backend layout (`backend/src/modules/<feature>/`) that the codebase never adopted; the real convention is layer-first (`controllers/`, `services/`, `repositories/`, `dto/`, `validators/`), domain-prefixed by filename (`finance-*`, `crm-*`). Sprint 0's tenancy files follow this unprefixed where the domain concept itself is platform-level (`organization.controller.ts`, `organization.service.ts`, `restaurant.repository.ts`, `branch.repository.ts`, `tenant.middleware.ts`) and will gain a `restaurant-*` prefix for anything genuinely Restaurant-business-specific starting Sprint 1 (`restaurant-menu.*`, `restaurant-inventory.*`, etc.) — mirroring the Finance/CRM pattern exactly.

## Decision 2: The Module Registry — an in-code catalog plus a DB enablement table, gating nav/route visibility only

`backend/src/config/module-registry.ts` declares every business module the platform knows about (`key`, `label`, `permission`). The DB half, `OrganizationModule(organizationId, moduleKey, enabled)`, records which of these are enabled per Organization — `moduleKey` is a free string referencing the in-code catalog, the same posture `Permission.name` already uses for RBAC, so enabling an *existing* module for a new customer is a config row, not a migration. `ModuleRegistryService.enabledModuleKeysByOrganization()` feeds `GET /organizations/me`'s `enabledModules` per Organization, consumed by the frontend's `useModuleEnabled()` hook (mirroring `useCan()`) to gate nav visibility only. **This is never the real enforcement** — `requirePermission`/`requireRestaurantAccess`/`requireBranchAccess` remain that, always.

Sprint 0 seeds exactly one `OrganizationModule` row (`restaurant`, enabled) for the one seeded Organization. Finance/CRM/Content Studio/AI Core are *listed* in the in-code catalog for completeness but have no `OrganizationModule` rows and consult nothing at runtime — they remain global and ungated by tenancy, unchanged, per ADR-0025's explicit non-goal.

## Decision 3: `GET /organizations/me` is the one read the frontend's tenant context is built on

`OrganizationService.getTenantContextForUser()` aggregates every Organization/Restaurant/Branch a user can see (Organization membership implies full access; Restaurant membership scopes to just that Restaurant, never its siblings) plus `enabledModules` per Organization, mapped through `dto/organization.mapper.ts`. No pagination, no filtering params — the working set per user is small by construction (a handful of Organizations at most), so this mirrors `roles.routes.ts`'s "authentication only, page visibility is the gate" posture rather than Finance/CRM's paginated list endpoints.

## Consequences

Positive:
- A new commercial customer, once Sprint 1's admin UI exists, can be enabled for the Restaurant module with a config row, no deploy.
- The Module Registry is inert for every module except Restaurant today — no behavior change for Finance/CRM/Content Studio/AI Core users.
- Nav/route visibility (`moduleKey` on `NavItem`, checked in `nav-group.tsx` alongside the existing `permission` check) is additive to the existing `useCan()` mechanism, not a parallel one.

Negative:
- The route-namespace shape for Restaurant business endpoints (`/api/v1/restaurant/...` vs. `/api/v1/organizations/:orgId/restaurants/...`) is still an open question, deliberately deferred to Sprint 1 when the first real business endpoint is built — `GET /organizations/me` itself doesn't need to resolve it (no restaurant-scoped route exists yet).
- `OrganizationModule` only has one real consumer (Restaurant) right now — its genericness is unproven until a second module (Retail, Salon, ...) actually uses it; if that never happens, revisit whether the DB table earns its keep versus a simpler "Restaurant is always enabled" default.

## Alternatives Considered

1. Adopt ADR-0023's proposed feature-module backend layout for Restaurant Operations specifically, diverging from the rest of the codebase — rejected; inconsistency with every existing module (Finance, CRM, Content Studio, AI Core) is worse than the layer-first convention's known tradeoffs.
2. No Module Registry at all — gate Restaurant nav purely by the `restaurant` RBAC permission — rejected; conflates "this user is allowed to use Restaurant Ops" with "this customer has purchased the Restaurant Ops module," two genuinely different commercial-SaaS concerns that will diverge the moment a second paying customer exists.
3. A fully dynamic, no-code module system (new business domains addable via configuration alone) — rejected as unrealistic and out of scope; a new domain like Retail will always require new backend/frontend code. The Module Registry solves *customer onboarding onto existing modules*, not *building new modules*, and this ADR does not overpromise otherwise.

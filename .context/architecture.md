# Architecture

Single responsibility: the canonical, always-current architectural overview. If any other document conflicts with this file, this file wins.

## System
Eyan AI Platform — CRM, Finance, Automation (MCP), AI Core, Content Studio, Restaurant Operations, all behind one Express/Prisma/PostgreSQL backend and one React/TanStack frontend.

## Principles
- Feature-first frontend, layered backend.
- Business logic lives in services; repositories own persistence; controllers stay thin; the frontend never contains business logic.
- Business modules invoke AI Capabilities — never AI Brains or Providers directly (see `ai-core.md`).
- Restaurant Operations is the platform's first multi-tenant module. Finance/CRM remain deliberately global shared workspaces (unchanged) — multi-tenancy is new infrastructure for Restaurant Ops only, not a retrofit. See `restaurant.md`.

## Multi-tenancy
`Organization → Restaurant → Branch` (Restaurant Operations only; Finance/CRM/Content Studio/AI Core have no tenant scoping). `OrganizationMember`/`RestaurantMember`/`BranchMember` grant access; `requireRestaurantAccess`/`requireBranchAccess`/`requireOrganizationAccess` enforce it, composed alongside `requirePermission`. Two independent authorization axes (ADR-0036): platform RBAC gates *which modules* a user can access (a `Restaurant Customer` platform Role hides every module but Restaurant Ops from commercial customers); `TenantRole` + `requireTenantRole` gates *what a user can do inside* Restaurant Ops. Full detail: `restaurant.md`, ADR-0025, ADR-0036.

## Backend flow
Route → Validation → Auth → Controller → Service → Repository → Prisma → PostgreSQL.

## AI flow
Business Module → Capability → Brain → Routing → Provider → Model → Prompt → Memory → MCP → Structured Response. Full detail: `ai-core.md`.

## CRM flow
Lead → Automation Hub → Validation → AI Qualification → CRM Updated → Dashboard. Full detail: `crm.md`.

## Status
AI Core Phase 1 (foundation) and Phase 3 (CRM migration) complete. Restaurant Operations Sprint 0 (tenancy foundation) complete, deployed, and verified in production. Sprint 1.1 (master-data CRUD), Sprint 1.2 (Customer-Facing Authorization & Staff Management — `Restaurant Customer` platform Role, expanded `TenantRole`, `BranchMember`, `requireTenantRole`, Staff Management), and Sprint 1.3 (Restaurant Product Foundation — Ingredient/IngredientCategory/Supplier/Unit/Recipe/RecipeIngredient, all Restaurant-scoped) all implemented and tested against the isolated dev database, not yet deployed to production. Current: AI Core Phase 2 (Chat/Video/Content migration) — see `current-sprint.md`.

## Deployment seeding
Two tiers, not one: `bootstrap.ts` (platform-required — roles, permissions, Restaurant tenancy foundation) runs automatically on every `deploy.sh` run; `seed.ts` (adds demo/sample content) stays manual, permanently. See `deployment.md`, ADR-0035.

## Deep reference
Full architecture writeup (700+ lines): `docs/ARCHITECTURE.md`. Decision history: `docs/architecture/decisions/`.

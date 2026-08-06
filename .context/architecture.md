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
`Organization → Restaurant → Branch` (Restaurant Operations only; Finance/CRM/Content Studio/AI Core have no tenant scoping). `OrganizationMember`/`RestaurantMember` grant access; `requireRestaurantAccess`/`requireBranchAccess` enforce it, composed alongside `requirePermission`. Full detail: `restaurant.md`, ADR-0025.

## Backend flow
Route → Validation → Auth → Controller → Service → Repository → Prisma → PostgreSQL.

## AI flow
Business Module → Capability → Brain → Routing → Provider → Model → Prompt → Memory → MCP → Structured Response. Full detail: `ai-core.md`.

## CRM flow
Lead → Automation Hub → Validation → AI Qualification → CRM Updated → Dashboard. Full detail: `crm.md`.

## Status
AI Core Phase 1 (foundation) and Phase 3 (CRM migration) complete. Restaurant Operations Sprint 0 (tenancy foundation) complete — no business features yet. Current: AI Core Phase 2 (Chat/Video/Content migration) — see `current-sprint.md`.

## Deep reference
Full architecture writeup (700+ lines): `docs/ARCHITECTURE.md`. Decision history: `docs/architecture/decisions/`.

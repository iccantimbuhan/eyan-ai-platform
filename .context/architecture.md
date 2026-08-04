# Architecture

Single responsibility: the canonical, always-current architectural overview. If any other document conflicts with this file, this file wins.

## System
Eyan AI Platform — CRM, Finance, Automation (MCP), AI Core, Content Studio, all behind one Express/Prisma/PostgreSQL backend and one React/TanStack frontend.

## Principles
- Feature-first frontend, layered backend.
- Business logic lives in services; repositories own persistence; controllers stay thin; the frontend never contains business logic.
- Business modules invoke AI Capabilities — never AI Brains or Providers directly (see `ai-core.md`).

## Backend flow
Route → Validation → Auth → Controller → Service → Repository → Prisma → PostgreSQL.

## AI flow
Business Module → Capability → Brain → Routing → Provider → Model → Prompt → Memory → MCP → Structured Response. Full detail: `ai-core.md`.

## CRM flow
Lead → Automation Hub → Validation → AI Qualification → CRM Updated → Dashboard. Full detail: `crm.md`.

## Status
AI Core Phase 1 (foundation) and Phase 3 (CRM migration) complete. Current: Phase 2 (Chat/Video/Content migration) — see `current-sprint.md`.

## Deep reference
Full architecture writeup (700+ lines): `docs/ARCHITECTURE.md`. Decision history: `docs/architecture/decisions/`.

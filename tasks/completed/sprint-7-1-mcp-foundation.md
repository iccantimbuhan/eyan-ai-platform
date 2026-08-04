# Sprint 7.1 — MCP Foundation

Status: Completed

## Goal

Build the reusable integration layer future automation providers (Canva, CapCut, GitHub, Docker, Filesystem, Google Drive, Slack, Discord, Notion, PostgreSQL, Redis, n8n) will register into — the platform, not any individual integration. Ship a complete, working, tested vertical slice (database → registry → services → API → frontend) proven end-to-end with one deterministic development connector, with zero real providers implemented.

## Scope

### In Scope

- MCP Provider/Connector interface, registry (`McpConnectorFactory`), and one fake connector (`FakeMcpConnector`)
- Prisma models: `AutomationConnection`, `McpServerConfig`, `AutomationAuditEvent`
- Services: `CredentialManagerService` (AES-256-GCM encryption), `AutomationConnectionService` (Connection Manager), `McpHealthService`, `AutomationAuditService`, `McpServerConfigService`
- REST API: Connections, MCP Servers (+ registered-providers listing + health-check trigger), Audit Logs — all under `/api/v1/automation/*`
- RBAC: two new permissions (`automation`, `automationcredentials`) plus reuse of a previously-unwired, pre-existing `auditlogs` permission
- Frontend: `features/automation` module — Providers, Connections, MCP Servers, Health, Audit Logs pages, new "Automation" sidebar group

### Out of Scope

Canva, CapCut, GitHub, Docker, Filesystem, Google Drive, Slack, Discord, Notion, n8n, PostgreSQL/Redis MCP connectors, OAuth authorize/callback flows, workflow execution, workflow templates — all later sprints per the approved Sprint 7 architecture review (`.claude/plans/` — architecture review document).

## What Shipped

A complete, working "fake provider" pipeline: register a connector type → create an encrypted credential (`AutomationConnection`) → register an MCP server instance referencing it (`McpServerConfig`) → run a health check (connects the fake connector, evaluates its reported status, persists the result) → see every step in the audit log — all through a real UI, all through real, tested backend services, none of it involving a real third-party integration yet. This is the seam Sprint 7.2 (Canva) plugs a real connector into.

## Files Created / Modified

**Backend** — 3 Prisma models + 4 enums (schema.prisma), 1 migration (`20260727183815_add_mcp_foundation`), 2 seeded permissions; `providers/interfaces/mcp-connector.ts`, `mcp-connector.factory.ts`, `mcp/fake-mcp.connector.ts`, `register-mcp-connectors.ts`; `utils/encryption.ts`; `errors/mcp-connector.error.ts`, `errors/automation-connection.error.ts`; repositories `automation-connection.repository.ts`, `mcp-server-config.repository.ts`, `automation-audit-event.repository.ts`; services `credential-manager.service.ts`, `automation-connection.service.ts`, `mcp-health.service.ts`, `automation-audit.service.ts`, `mcp-server-config.service.ts`; DTOs/mappers for all three response shapes; validators, controllers, and routes for Connections/MCP Servers/Audit Logs; `app.ts` wiring; `config/env.ts` (`automationEncryptionKey`). ~30 new backend test files/additions.

**Frontend** — `features/automation/` (types, api client, 3 hook files, 2 zod schemas, shared status-badge helpers, 10 page/dialog/action components, 3 component test files); 5 new route files under `routes/_authenticated/automation/`; `sidebar-data.ts` (new "Automation" nav group).

**Docs** — this file; `docs/architecture/decisions/ADR-0012-mcp-foundation.md`; `docs/ARCHITECTURE.md`; `PROJECT_STATE.md`; `CHANGELOG.md`; `backend/.env.example`.

## Database Changes

Three new, purely additive tables (migration `20260727183815_add_mcp_foundation`), zero changes to any of the 29 existing models:

- `AutomationConnection` — owner-scoped (`userId`), encrypted credential (`encryptedCredentials`/`credentialsIv`, AES-256-GCM), `ConnectionStatus` lifecycle (`PENDING/ACTIVE/EXPIRED/REVOKED/ERROR`).
- `McpServerConfig` — platform-level (not user-scoped), `provider`/`transport`/`command`/`args`/`url`/optional `connectionId`, `McpHealthStatus` (`UNKNOWN/HEALTHY/UNREACHABLE/ERROR`).
- `AutomationAuditEvent` — append-only, polymorphic `(targetType, targetId)`, same posture as `AssetReviewEvent` (ADR-0009).

Two new permissions seeded (`automation`, `automationcredentials`); no schema change needed to reuse the pre-existing, previously-unwired `auditlogs` permission for the new audit-log routes.

## API Changes

All under `/api/v1/automation`, `authenticate`-gated, `automation`/`automationcredentials`/`auditlogs`-permission-gated per route (see `docs/ARCHITECTURE.md`'s new MCP Foundation section for the full table):

- `GET/POST /connections`, `GET/PATCH/DELETE /connections/:id`, `POST /connections/:id/{rotate,enable,disable}` — no `/reveal` route exists anywhere; raw credentials are never returned by any response.
- `GET /mcp-servers`, `GET /mcp-servers/providers`, `POST /mcp-servers`, `GET/PATCH/DELETE /mcp-servers/:id`, `POST /mcp-servers/:id/health-check`.
- `GET /audit-logs`, `GET /audit-logs/connections/:connectionId` — paginated.

## Validation

- Build: backend `tsc --noEmit` clean throughout; frontend `tsc -b && vite build` succeeds, all 5 new route chunks present.
- Typecheck: clean at every milestone checkpoint.
- Prisma: `npx prisma validate` clean throughout; one migration applied cleanly, zero drift.
- Tests: backend 57 files / 562 tests passing at Milestone 5 (all new work); frontend 66 files / 347 tests, 343 passing — the 4 failures are pre-existing `user-auth-form.test.tsx` baseline failures, confirmed unrelated (file untouched by this sprint, fails identically in isolation).
- Live boot smoke test: clean `tsx src/index.ts` startup with no wiring errors.

## Decisions Made

See `docs/architecture/decisions/ADR-0012-mcp-foundation.md` for full rationale on: the registry pattern choice (mirrors `PlatformProviderFactory`, not `ImageProviderFactory` — no env-var default, since many MCP servers run simultaneously); why connectors never decrypt credentials (`CredentialManagerService` is the sole caller of the encryption util); why business logic stays in services (controllers/connectors both stay thin); why the frontend has no business logic (permission gates mirror the backend, never substitute for it); and how a future real provider (Canva, GitHub, ...) should integrate.

Two small, additive, non-breaking extensions to already-approved milestones, both explicitly flagged to the user at the time: `AutomationConnectionRepository.findByIdForSystem()` (a non-owner-scoped lookup for system-initiated health checks) and `AutomationConnectionService.getById()` (exposing an existing private ownership-checked lookup publicly, for the detail-view controller). Neither changed any existing method's behavior.

One necessary addition beyond the original Milestone 4 brief: `McpServerConfigService` — nothing else owned `McpServerConfig`'s CRUD lifecycle, and controllers must go through a service, never a repository, per `.context/backend.md`.

## Follow-ups for Future Sprints

- Sprint 7.2 (Canva): register a real `CanvaProvider` (also a first-class `DesignProvider`, per the approved architecture doc) + `CanvaMcpConnector` adapter — no changes needed to `McpConnectorFactory`, any Milestone 4 service, or any route.
- OAuth authorize/callback flow for OAuth-based providers (GitHub, Slack, Discord, Notion, Google Drive) — `AutomationConnection` already has the storage shape (`status: PENDING/ACTIVE/EXPIRED`), only the authorize/callback routes and per-provider client-id/secret config are missing.
- n8n integration (`WorkflowDefinition`, `WorkflowExecution`, workflow execution/templates) — a separate concern from the MCP Foundation per the approved architecture doc, not blocked by anything in this sprint.
- `AutomationAuditAction` will need additive new enum values as real providers/workflows arrive (e.g. `WORKFLOW_EXECUTED`) — grow the enum, never repurpose an existing value.
- No stdio-process spawning/teardown lifecycle exists yet for real STDIO-transport connectors (only `FakeMcpConnector`'s in-process no-op today) — needed before a real filesystem/GitHub/Postgres MCP server (typically `npx`-invoked stdio processes) can be wired in.
- `McpServersPage`/`HealthPage` have no dedicated frontend test files (they follow the identical pattern already covered by `ConnectionsPage`'s/`ProvidersPage`'s tests) — low-priority coverage gap, not a defect.

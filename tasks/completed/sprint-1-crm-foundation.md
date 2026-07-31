# Sprint 1 — CRM Foundation

Status: Completed

## Goal

Build the CRM Foundation's Sprint 1 slice: the data model, server-enforced lead lifecycle, and full CRUD surface for manual lead management — positioned as the first pillar of a future Sales Workspace, not a point solution, per the approved TDD (`/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`) and `docs/standards/IMPLEMENTATION_RULES.md`.

## Scope

### In Scope

- Prisma models: `Lead`, `LeadActivity`, `LeadAiAnalysis` (schema-only), `WorkflowExecutionLog` (schema-only, platform-wide)
- `crm` RBAC permission
- Backend: DTOs, validators, repositories, services, controllers, routes for `Lead`/`LeadActivity`
- Public rate-limited lead intake endpoint
- Server-enforced status lifecycle transition map
- Frontend: `features/crm/` — Dashboard, Leads table, Lead Detail (AI Analysis empty state, Timeline, Notes, Status/Assign/Edit dialogs), sidebar integration
- Backend + frontend unit tests (repository, service, controller, validator, permission, lifecycle-helper)
- Documentation (ADR, architecture, product blueprint, project state)

### Out of Scope (explicit — Sprint 2+)

- n8n / AI orchestration / prompt execution
- Webhooks (inbound or outbound)
- `authenticateService` middleware, `AUTOMATION_SERVICE_API_KEY` / `AUTOMATION_WEBHOOK_SIGNING_SECRET`, `/crm/leads/service/*` routes
- Notifications (Discord/Slack/Email/Webhook)
- External integrations
- A public-facing Lead Form UI (only the API endpoint it would submit to)

## What Shipped

**Backend** — full layered implementation under `/api/v1/crm/leads`, following the existing 8-artifact order (DTO → Validator → Repository → Service → Controller → Route → Permission → Test):

- `Lead`: shared workspace (no per-row ownership, mirrors `Expense`), `status`/`score`/`priority`/`assignedToId`/`lostReason`, `rawSubmission` (verbatim Lead Form payload for audit).
- `LeadActivity`: one append-only timeline serving both "Activity History" and "Automation History" (`NOTE`/`STATUS_CHANGE`/`ASSIGNMENT`/`AI_ANALYSIS`/`AUTOMATION`), filtered by type in the UI.
- `CrmLeadService.ALLOWED_TRANSITIONS`: the single source of truth for legal status transitions — `NEW → VALIDATED → AI_ANALYZED → QUALIFIED → CONTACTED → NEGOTIATION → CONVERTED`, `LOST` reachable from `VALIDATED` onward, `NEW → DISQUALIFIED` as `NEW`'s only other path, `CONVERTED`/`LOST`/`DISQUALIFIED` terminal.
- Status/assignment changes await their paired `LeadActivity` write and let a failure propagate — a deliberate departure from Finance's fire-and-forget audit pattern, since this timeline is user-visible, not supplementary (see ADR-0018 Decision 3).
- `POST /api/v1/crm/leads` is public (no `authenticate`), protected instead by a new `publicLeadIntakeRateLimiter` (20 req/15min/IP, new `express-rate-limit` dependency) and full `express-validator` validation/sanitization.
- `LeadAiAnalysis` / `WorkflowExecutionLog` are in the schema, unpopulated — reserved for Sprint 2/3.

**Frontend** — `frontend/src/features/crm/`:

- Dashboard: 4 stat cards (Total/New/Qualified+/Converted), pipeline-by-status Pie chart (reuses Finance's single-100%-slice donut workaround), recent leads list.
- Leads: searchable/filterable TanStack Table view, reusing `components/data-table/*`.
- Lead Detail: AI Analysis card (honest empty state until Sprint 2/3), Timeline (merged activity/automation history + inline note entry), Details card + Edit dialog, Status card + Change Status dialog (only valid next statuses offered), Assigned Sales Rep card + Assign dialog (reuses `features/users`' existing `useUsers()`).
- New "Sales" sidebar group (`Contact` icon), first pillar of the longer-term Sales Workspace vision.
- `crm` added to the Roles-UI permission registry (`features/roles/config/permissions.ts`).

## Files Created / Modified

**Backend (new)**: `errors/crm.error.ts`, `dto/crm-lead.dto.ts`, `dto/crm-lead.mapper.ts`, `validators/crm-lead.validator.ts`, `repositories/crm-lead.repository.ts`, `repositories/crm-lead-activity.repository.ts`, `services/crm-lead.service.ts`, `controllers/crm-lead.controller.ts`, `middleware/rate-limit.middleware.ts`, `routes/v1/crm-leads.routes.ts`, plus a `.test.ts` beside each of repository/service/controller/validator, and `routes/v1/crm-leads.permission.test.ts`.

**Backend (modified)**: `prisma/schema.prisma` (+2 relations on `User`, +7 enums, +4 models), `prisma/migrations/20260731143055_crm_foundation_sprint1/`, `prisma/seed.ts` (+`crm` permission), `src/app.ts` (route mount), `package.json`/`pnpm-lock.yaml` (+`express-rate-limit`).

**Frontend (new)**: `features/crm/` (types, api, hooks, lib incl. `lead-lifecycle.ts` + its test, schemas, `index.tsx`, all `pages/dashboard/*` and `pages/leads/*` components), `routes/app/_authenticated/crm/index.tsx`, `routes/app/_authenticated/crm/leads/index.tsx`, `routes/app/_authenticated/crm/leads/$leadId.tsx`.

**Frontend (modified)**: `components/layout/data/sidebar-data.ts` (+"Sales" group), `features/roles/config/permissions.ts` (+CRM category), `routeTree.gen.ts` (auto-generated).

**Docs**: `.claude/decisions/ADR-0018-crm-foundation.md` (new), `docs/ARCHITECTURE.md` (+"CRM Foundation Architecture" section), `docs/product/04_DATABASE.md`/`05_API.md`/`06_UI.md` (+CRM sections), `docs/product/02_ROADMAP.md` (annotation on the "CRM" out-of-scope-for-V1.0 line), `.claude/context/repository-map.md` (+CRM entries), `PROJECT_STATE.md` (Current Sprint / Status / Next Task / Known Issues / Pointers updated), this file.

## Database Changes

Migration `20260731143055_crm_foundation_sprint1` — additive only, zero changes to existing models/columns:

- New enums: `LeadSource`, `LeadStatus`, `LeadPriority`, `LeadActivityType`, `QualificationLevel`, `EstimatedTimeline`, `WorkflowExecutionStatus`.
- New models: `Lead`, `LeadActivity`, `LeadAiAnalysis`, `WorkflowExecutionLog`.
- `User` gained two new relations (`assignedLeads`, `leadActivities`), no column changes.

## API Changes

New, all under `/api/v1/crm/leads`:

| Method | Path | Auth |
|---|---|---|
| POST | `/` | Public, rate-limited |
| GET | `/` | `crm` permission |
| GET | `/:id` | `crm` permission |
| PATCH | `/:id` | `crm` permission |
| PATCH | `/:id/status` | `crm` permission |
| PATCH | `/:id/assign` | `crm` permission |
| POST | `/:id/notes` | `crm` permission |

## Validation

- Build: backend `tsc` clean; frontend `tsc -b && vite build` clean.
- Typecheck: clean on both sides.
- Lint: backend has no lint script (typecheck substitutes). Frontend: 0 errors in new code; 2 pre-existing-pattern `react-hooks/incompatible-library` informational warnings (same kind already present on Finance's/Roles'/Users' table components).
- Tests: backend 728/728 passing (37 new). Frontend 410/414 passing (6 new, all passing) — 4 failures are the pre-existing, already-documented `search-provider.test.tsx`/`user-auth-form.test.tsx` baseline, reconfirmed identical via `git stash` against the pre-CRM sidebar state.
- Live validation: throwaway backend instance on a spare port (production `:3001` untouched), temporary Owner-role user (created and deleted within the session) — full create → list → detail → valid status transition → invalid status transition (400 confirmed) → note cycle via curl, all responses inspected.

## Decisions Made

See `.claude/decisions/ADR-0018-crm-foundation.md` for full rationale. Summary:

1. Shared workspace, single `crm` permission — no per-lead ownership.
2. `LeadActivity` is one table for both Activity History and Automation History.
3. Status/assignment writes await their activity row instead of firing-and-forgetting it; no cross-repository DB transaction exists yet (known limitation, not fixed this sprint).
4. `LeadAiAnalysis`/`WorkflowExecutionLog` exist in the schema now, unpopulated until Sprint 2/3.
5. Server-enforced lifecycle map is the single source of truth; `salesStageRecommendation` was never added as an AI field (per the TDD's Phase 0.5 review) to avoid a second authority over lead stage.
6. Service-facing (`authenticateService`) routes were deferred out of Sprint 1 — a sequencing adjustment from the TDD's original sprint plan, not an architectural change, driven by this sprint's explicit brief excluding Automation/Webhooks.

## Follow-ups for Future Sprints

- Sprint 2 ("Cross-System Skeleton"): `authenticateService` middleware, `AUTOMATION_SERVICE_API_KEY`/`AUTOMATION_WEBHOOK_SIGNING_SECRET`, `/crm/leads/service/*` routes, n8n Workflows 1–2 (Lead Intake, Validation) against a stubbed AI score.
- Sprint 3: real AI qualification (Workflow 3), confidence-tiered automation, Human Review Queue enforcement.
- Sprint 5 (per the TDD): Automation Runs page in `features/automation/` (not CRM), using `WorkflowExecutionLog`'s already-present `domain` field.
- A real cross-repository `$transaction` for the status/assignment + activity write pair, if a partial-failure incident is ever observed.
- A public-facing Lead Form page (out of this sprint's listed frontend deliverables).

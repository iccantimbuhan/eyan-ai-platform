# Sprint 2 — CRM Automation Integration Contract (EYAN side only)

Status: Completed

## Goal

Build the EYAN AI Platform half of the cross-system contract between this backend and `eyan-automation-hub` (n8n) — service authentication, signed outbound webhook dispatch, the n8n-facing write-back endpoints, and idempotency — proving the hard part (auth, signing, replay-safety) before Sprint 3 adds real AI qualification. Per the approved TDD (`/home/eyancantimbuhan/.claude/plans/project-ai-sales-clever-dijkstra.md`) §23 Sprint 2 ("Cross-System Skeleton") and `.claude/decisions/ADR-0018-crm-foundation.md` Decision 6.

## Scope

### In Scope

- `.claude/decisions/ADR-0019-automation-integration-contract.md`, written and reviewable before any code — the sprint brief's explicit precondition.
- `authenticateService` middleware, `AUTOMATION_SERVICE_API_KEY`
- `AUTOMATION_WEBHOOK_SIGNING_SECRET`, HMAC-signed outbound webhook dispatch on lead creation
- `/api/v1/crm/service/*` endpoints: dedupe lookup, validation write-back, qualification write-back
- Idempotency (keyed on `{ workflowName, workflowExecutionId }`, reusing `WorkflowExecutionLog`)
- A "dummy qualification response" — the real Workflow 3/4 write-back contract, exercised with a stub payload

### Out of Scope (explicit — this sprint's brief, and a mid-sprint repo-boundary clarification)

- **`eyan-automation-hub` itself** — n8n's real Workflow 1 (Lead Intake) and Workflow 2 (Validation) JSON definitions. The sprint brief listed "Workflows 1 and 2" as in-scope, which conflicted with the standing "do not modify eyan-automation-hub" constraint from Sprint 1's brief; this was surfaced to the user before any code was written, and the user confirmed: EYAN side only, `eyan-automation-hub` stays untouched, its implementation is its own future sprint. Everything below was verified with curl standing in for n8n.
- Real AI (no Ollama call, no prompt template, no schema-validation-with-retry) — Sprint 3.
- Notifications (Workflow 5), execution telemetry as its own workflow (Workflow 6) — folded into the two mutation endpoints' own execution logging instead, proportionate to this sprint's two real write-back calls.
- The Human Review Queue UI (`needsManualReview` is stored and returned, nothing acts on it yet).
- Any frontend work — not listed in this sprint's deliverables.

## What Shipped

**ADR-0019** — six decisions (webhook auth, service auth, retry policy, timeout policy, idempotency strategy, versioning strategy) plus four rejected alternatives, including a deliberate implementation adjustment from the TDD's own narrative: `AUTOMATION_SERVICE_API_KEY`/`AUTOMATION_WEBHOOK_SIGNING_SECRET` are optional env vars with fail-closed behavior on first use (matching `AUTOMATION_ENCRYPTION_KEY`'s established precedent), not `requireEnv()`-at-boot as the TDD's §11 narrative suggested — requiring them at boot would have broken every existing dev/CI/test environment, including this repo's own pre-Sprint-2 728-test backend suite.

**Backend** — no Prisma migration; every field this sprint writes to already existed from Sprint 1's schema-ahead-of-use design (ADR-0018 Decision 4):

- `middleware/service-auth.middleware.ts` — `authenticateService`, a static bearer token check via `crypto.timingSafeEqual`, fails closed (500) if `AUTOMATION_SERVICE_API_KEY` is unset rather than authenticating every caller against an empty comparison value.
- `utils/automation-signature.ts` — `signAutomationPayload()`, HMAC-SHA256 over `${timestamp}.${rawBody}` (not the body alone), binding the signature to a specific moment.
- `services/automation-webhook.service.ts` — `AutomationWebhookService.dispatchLeadIntake()`, fire-and-forget (never awaited by its caller, internal try/catch swallows and logs every failure), skips the dispatch entirely (not an error) when the Automation Hub isn't configured. Wired into `CrmLeadService.create()` as a new, optional, injectable constructor dependency.
- `services/crm-automation-ingest.service.ts` — `CrmAutomationIngestService`, the n8n write-back surface: `findByEmail()` (dedupe), `applyValidationResult()` (Workflow 2's VALIDATED/DISQUALIFIED result), `applyQualificationResult()` (the dummy/stub qualification write-back — creates a `LeadAiAnalysis` row, moves the lead to `AI_ANALYZED`, sets score/priority). Both mutation methods import `ALLOWED_TRANSITIONS` from `CrmLeadService` (now exported) rather than duplicating the lifecycle map, and both check `WorkflowExecutionLog` for a prior `SUCCESS`-status execution with the same `{ workflowName, workflowExecutionId }` before applying anything — a replay is a safe no-op, not a re-applied mutation or a duplicate `LeadAiAnalysis` row.
- `repositories/workflow-execution-log.repository.ts`, `repositories/crm-ai-analysis.repository.ts` — new repositories, `crm-lead.repository.ts` gained `updateQualification()` (status + score + priority together, distinct from the user-facing `updateStatus()`/`assign()` split).
- `dto/crm-automation.dto.ts`, `validators/crm-automation.validator.ts` — every service mutation requires `contractVersion`/`workflowExecutionId`/`workflowName`; the qualification validator mirrors the TDD §14 AI JSON schema exactly, including the five Phase 0.5-review fields.
- `controllers/crm-automation.controller.ts`, `routes/v1/crm-service.routes.ts` — mounted at `/api/v1/crm/service`, every route behind `router.use(authenticateService)`. A dedupe miss responds `200` with `data.lead: null`, not a `404` — a miss is the expected common case for a dedupe check, not an error.
- `config/env.ts` — `automationServiceApiKey`, `automationWebhookSigningSecret`, `automationHubWebhookUrl`, `automationWebhookTimeout` (default `5000`ms).

## Files Created / Modified

**Backend (new)**: `middleware/service-auth.middleware.ts` (+`.test.ts`), `utils/automation-signature.ts` (+`.test.ts`), `services/automation-webhook.service.ts` (+`.test.ts`), `services/crm-automation-ingest.service.ts` (+`.test.ts`), `repositories/workflow-execution-log.repository.ts` (+`.test.ts`), `repositories/crm-ai-analysis.repository.ts` (+`.test.ts`), `dto/crm-automation.dto.ts`, `validators/crm-automation.validator.ts` (+`.test.ts`), `controllers/crm-automation.controller.ts` (+`.test.ts`), `routes/v1/crm-service.routes.ts`.

**Backend (modified)**: `config/env.ts` (+4 new fields), `.env.example` (+documented vars), `src/app.ts` (route mount), `services/crm-lead.service.ts` (exported `ALLOWED_TRANSITIONS`, added `webhookService` constructor dependency, `create()` now dispatches the lead-intake webhook), `services/crm-lead.service.test.ts` (+2 tests), `repositories/crm-lead.repository.ts` (+`updateQualification()`), `repositories/crm-lead.repository.test.ts` (+1 test).

**Docs**: `.claude/decisions/ADR-0019-automation-integration-contract.md` (new), `docs/ARCHITECTURE.md` (+"Sprint 2 — Automation Integration Contract" subsection), `docs/product/04_DATABASE.md`/`05_API.md` (+Sprint 2 sections), `.claude/context/repository-map.md` (+Sprint 2 entries), `PROJECT_STATE.md` (Current Sprint/Status/Next Task/Known Issues/Pointers updated), this file.

## Database Changes

None. Every field written to by Sprint 2 (`WorkflowExecutionLog.n8nExecutionId`/`workflowName`/`status`/`durationMs`/`errorMessage`, all of `LeadAiAnalysis`) already existed in Sprint 1's migration.

## API Changes

New, all under `/api/v1/crm/service`, `authenticateService`-gated (static bearer token, never a user JWT):

| Method | Path | Notes |
|---|---|---|
| GET | `/leads?email=` | Dedupe lookup — `data.lead: null` on a miss, not a 404 |
| PATCH | `/leads/:id/validation` | Workflow 2's result — `status: VALIDATED \| DISQUALIFIED` |
| PATCH | `/leads/:id/qualification` | The dummy/stub qualification write-back — full AI JSON schema + execution metadata |

## Validation

- Typecheck: clean (`npx tsc --noEmit`).
- Tests: 773/773 backend passing (45 new — signature utility, `authenticateService`, both new repositories, `AutomationWebhookService`, `CrmAutomationIngestService` including idempotent-replay and illegal-transition coverage for both write-back methods, `CrmAutomationController`, and the automation validators).
- Live validation: throwaway backend instance on a spare port (production `:3001` untouched), temporary Owner-role user (created and deleted within the session) — auth gate (no header, wrong token, unconfigured key, correct token), dedupe (miss then hit), a full `NEW → VALIDATED → AI_ANALYZED` chain via the two service endpoints with the resulting `Lead`/`LeadActivity` ×2/`LeadAiAnalysis`/`WorkflowExecutionLog` ×2 rows all inspected via the user-facing detail endpoint, idempotent replay of both endpoints (confirmed a replay carrying deliberately different — wrong — values did not overwrite the original result), an illegal-transition rejection (400), and a malformed-payload rejection (400). All smoke-test leads and the temporary user were deleted afterward.
- Mid-session cleanup, unrelated to this sprint's own code: six orphaned `tsx watch` processes from prior sessions (dated Jul30) were discovered still running; one had auto-restarted on port 3099 in response to this sprint's file edits and intercepted the first round of smoke-test requests with a stale (pre-Sprint-2) environment, producing confusing 500s that traced back to a completely different, forgotten process rather than a bug in the new code. All six were confirmed non-production (the real systemd-managed backend is a separate `dist/index.js` process, left untouched) and terminated before re-running the smoke test cleanly.

## Decisions Made

See `.claude/decisions/ADR-0019-automation-integration-contract.md` for full rationale and rejected alternatives. Summary:

1. Webhook auth (EYAN→n8n): HMAC-SHA256 over `${timestamp}.${rawBody}`, fire-and-forget, zero retries on EYAN's side.
2. Service auth (n8n→EYAN): static bearer token, `timingSafeEqual`, fails closed.
3. Retries are entirely n8n's responsibility — EYAN's endpoints are simply idempotent.
4. Timeouts: 5s default on the outbound dispatch only; inbound service routes use the platform's existing (no) per-route timeout, since they're synchronous DB writes.
5. Idempotency via `WorkflowExecutionLog.n8nExecutionId` (app-level check, not a DB constraint) — reused, not a new dedup table.
6. Versioning: URL `/v1` unchanged; a separate `contractVersion` field tracks the cross-system JSON shape independently.
7. A repo-boundary conflict (this sprint's brief listed "Workflows 1 and 2" as in-scope, contradicting the standing "don't touch eyan-automation-hub" constraint) was surfaced to the user before implementation began; the user confirmed EYAN-side-only, deferring the Automation Hub repo entirely to its own future sprint.

## Follow-ups for Future Sprints

- **`eyan-automation-hub` implementation** (its own sprint, not yet started or approved): the real n8n Workflow 1 (Lead Intake) and Workflow 2 (Validation) JSON definitions, wired against the endpoints this sprint built.
- **Sprint 3** (real AI qualification): replace the dummy/stub qualification payload with an actual Ollama call, a versioned prompt template, and schema-validation-with-retry — the write-back contract (`PATCH /crm/service/leads/:id/qualification`) doesn't need to change shape.
- **Human Review Queue enforcement**: `LeadAiAnalysis.needsManualReview` is stored and returned but nothing acts on it yet — a Lead Dashboard "Needs Review" filter/tab is a frontend follow-up.
- **DB-level idempotency**: if a real duplicate-write incident is ever observed under concurrent n8n callers, revisit the app-level `WorkflowExecutionLog` lookup with a real unique constraint.

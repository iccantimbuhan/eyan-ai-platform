# CRM

Single responsibility: the CRM (leads / sales pipeline) module — file locations, pipeline flow, and rules unique to this domain.

## Files
- Backend: `backend/src/{controllers,services,repositories}/crm-*`
- Frontend: `frontend/src/features/crm`

## Pipeline
Lead created → Automation Hub (n8n, companion repo `eyan-automation-hub`) → Lead Intake → Validation → AI Qualification (via AI Core — see `ai-core.md`) → CRM updated → Dashboard.

## Rules
- Lifecycle transitions are server-enforced in exactly one place: `CrmLeadService.ALLOWED_TRANSITIONS`. Other services (e.g. `CrmAutomationIngestService`) import it — never re-derive or duplicate the transition map.
- n8n-facing routes (`/crm/service/*`) are gated by `authenticateService` (static bearer token), separate from the user-facing JWT auth path.
- Outbound webhooks to the automation hub are HMAC-signed (`AutomationWebhookService`) and fire-and-forget — they never block the user-facing response.
- AI qualification write-back must accept `"UNKNOWN"` as a legitimate model answer for `buyingIntent` / `urgency` / `riskLevel` (normalize to `null` before persisting). A real model legitimately answers this when unsure — rejecting it stalls the lead at `VALIDATED` (this exact bug was Sprint 5.2's fix).

## Status
AI Core migration complete (Phase 3) — qualification calls go through AI Core, not Ollama directly. See `current-sprint.md`.

## Decisions
ADR-0018 (foundation), ADR-0019 (automation integration contract), ADR-0020 (AI provider contract), ADR-0022 (sales qualification automation) — `docs/architecture/decisions/`.

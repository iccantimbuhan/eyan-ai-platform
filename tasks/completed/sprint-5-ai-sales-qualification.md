# Sprint 5 — AI Sales Qualification & CRM Automation

Status: Completed (2026-08-02)

Full design rationale: `docs/architecture/decisions/ADR-0022-sales-qualification-automation.md`. Companion repo changes: `eyan-automation-hub`'s `docs/development-log/sprint-4-sales-automation.md`.

---

## 1. Executive Summary

The sprint brief asked for a complete website-lead → AI-qualification → CRM-update → pipeline-automation → n8n-sales-automation flow, framed as "reconnect Workflow 3" (implying it was previously wired to AI Core and disconnected). Investigation found the opposite: Workflow 3 (`eyan-automation-hub`) had never called AI Core — it called Ollama directly, which is exactly the "bypass AI Core" pattern this sprint's own non-negotiable rules forbid. AI Core's `lead-qualification` Capability existed (seeded, schema-matched) but nothing had ever invoked it. The real gap was: (1) make that Capability reachable by n8n, (2) re-point Workflow 3 at it instead of Ollama, and (3) build the downstream sales-automation consumer, which neither repo had ever built (reserved in `eyan-automation-hub`'s own roadmap as a never-started "Workflow 5").

All of that is now built, tested, and — for the backend half — **live-verified against real infrastructure** (a running local `eyan-ai-platform` instance, real Postgres, real Ollama with `qwen2.5-coder:7b`), not just unit-tested. No Prisma migration was needed. Nothing about AI Core's frozen architecture (ADR-0021) or CRM's pipeline-authority model (ADR-0018) was redesigned — every change is additive, following patterns the codebase had already established for exactly this kind of extension.

**Not done, honestly**: a real salesperson-routing engine (a single configurable default owner stands in); live verification of Workflow 4's Slack/email notification steps (no real credentials available); execution of either changed/new n8n workflow through n8n's own engine (no interactive n8n UI/API-key access this session — verification instead replayed the same HTTP calls by hand against the real backend).

---

## 2. Website Lead Flow Analysis

No separate public website, and no multiple lead-capture forms (Contact/Demo/Quote/Consultation), exist in this repo. `POST /api/v1/crm/leads` (`backend/src/routes/v1/crm-leads.routes.ts`) is already the single, unauthenticated, rate-limited lead-creation entry point, built in an earlier sprint. `LeadSource` only has `WEBSITE_FORM | MANUAL | API` — there was never a second implementation to consolidate. This phase required no code change; verified, not invented.

---

## 3. CRM Integration

`CrmAutomationIngestService.applyQualificationResult()` (the n8n write-back receiver) now:

- Writes the `LeadAiAnalysis` row and the `AI_ANALYZED` status exactly as before (unchanged, preserves existing replay/idempotency behavior).
- **New**: auto-routes the pipeline by a new `confidenceTier` field on the write-back payload (sourced from AI Core, never recomputed) — `HIGH → QUALIFIED`, `LOW → DISQUALIFIED`, `MEDIUM`/missing stays `AI_ANALYZED`. Required one small, deliberate addition to the shared `ALLOWED_TRANSITIONS` table: `AI_ANALYZED → DISQUALIFIED` (previously only reachable from `NEW`).
- **New**: records a second `LeadActivity` (type `AUTOMATION`) with the AI's recommended next action and a computed follow-up window derived from `estimatedTimeline`.
- **New**: fires the `lead.qualified` webhook once fully applied.

No duplicate information is written — the pipeline-stage decision lives in exactly one place (`CrmAutomationIngestService`), consistent with ADR-0018 Decision 5's "one authority over pipeline stage" rule.

---

## 4. AI Qualification Integration

A new route, `POST /api/v1/ai-core/service/capabilities/:capabilityKey/invoke`, gated by the existing `authenticateService` middleware (reused, not modified), makes any AI Core Capability reachable by a service caller — the exact extension point `ai-capability.controller.ts`'s own Phase 1 comment anticipated ("Phase 3 ... mirroring how CRM's own /crm/service/* routes were added"). The existing human-JWT route is untouched (ADR-0021's "architecture frozen").

`eyan-automation-hub`'s Workflow 3 was rewritten: the 11-node direct-Ollama chain (provider selection, prompt loading, its own retry loop, its own three-class failure classification) is replaced by 3 nodes that call this new route and map its response onto the same CRM write-back contract. AI Core's own `AiRoutingPolicy` (max 3 retries, confidence thresholds) now does what the n8n retry loop used to do — no duplicated retry/classification logic between the two systems.

**Live-verified this session**: a real `POST` to the new route, with a real lead's fields, produced a genuine AI Core → Ollama round trip — `outcome: VALID`, `confidence: LOW` (0.3, below the seeded 0.4 medium threshold), full structured `outputJson`, `latencyMs: 205382` (~3.4 minutes on this hardware for `qwen2.5-coder:7b`).

---

## 5. Pipeline Automation

Confidence-tier → pipeline-stage mapping (see §3) reuses the existing `LeadStatus` enum and `ALLOWED_TRANSITIONS` table — no hardcoded stage logic outside that one table, and the thresholds producing the tier live in AI Core's `AiRoutingPolicy`, already configurable per Brain without a code change. **Live-verified**: a real LOW-confidence result auto-routed a real lead `AI_ANALYZED → DISQUALIFIED` in the database.

---

## 6. n8n Workflow Integration

`eyan-automation-hub` Workflow 3 re-pointed at AI Core (§4). New Workflow 4 (`04-sales-automation.json`, id `CrmSalesAutomationWf01`) built from scratch — the sprint's actual "Workflow 3" in the brief's own description (receives lead + qualification + confidence + recommended action, performs sales automation):

- Triggered by a new `lead.qualified` webhook (`POST /webhook/crm/lead-qualified`), same HMAC-signature verification shape as the existing lead-intake webhook, reusing the same signing credential.
- **Assign salesperson**: `PATCH /crm/service/leads/:id/assign` (new backend route, §below), gated behind "not already assigned + a default owner is configured."
- **Slack notification**: HTTP POST to a configurable incoming-webhook URL, gated behind that URL being set.
- **Email notification**: n8n's native Send Email node, gated behind a recipient address being set.
- Does **not** re-derive pipeline stage or re-run AI logic — by the time it fires, EYAN has already fully applied the qualification result; n8n only orchestrates the notification/assignment side effects, per the brief's own "n8n orchestrates only" rule.

A new backend route, `PATCH /api/v1/crm/service/leads/:id/assign`, backs the assignment step — **live-verified** with a real lead.

---

## 7. Activities

`applyQualificationResult()` now creates an `AUTOMATION`-type `LeadActivity` alongside the existing `AI_ANALYSIS` note, body = the AI's `recommendedAction`, metadata carries a computed follow-up window (`IMMEDIATE`→same day, `SHORT_TERM`→3d, `MEDIUM_TERM`→14d, `LONG_TERM`→30d, `UNKNOWN`→7d) derived from the AI's `estimatedTimeline`. **Live-verified**: a real Activity was created with the correct body and `followUpDueInDays: 7` for an `UNKNOWN` timeline.

A true scheduled reminder-*sender* (as opposed to a due-date recorded in Activity metadata) does not exist in either repo and was not built — flagged in §15, not silently assumed complete.

---

## 8. Audit Trail

No new tables. Confirmed sufficient by direct database inspection this session:

- `LeadAiAnalysis` — one row per qualification run (provider/model/promptVersion/confidence/score/etc.), `rawResponse` now also carries AI Core's routing metadata (brain, outcome, retryCount, latencyMs) verbatim.
- `AiUsageLog` — written **automatically** by `AiRoutingService.execute()` the instant the new service route is used; confirmed a real row with correct `capabilityId`/`outcome`/`latencyMs`/`needsManualReview` after the live test.
- `WorkflowExecutionLog` — confirmed rows for validation, qualification, and assignment write-backs.

One gap noted, not silently fixed: `AiUsageLog` has no `confidence`/`promptVersion` column (already flagged in ADR-0021); querying usage by confidence tier requires joining through `LeadAiAnalysis.rawResponse`.

---

## 9. Files Created

**eyan-ai-platform**:
- `backend/src/routes/v1/ai-core-service.routes.ts`
- `backend/src/services/crm-lead-transitions.ts`
- `docs/architecture/decisions/ADR-0022-sales-qualification-automation.md`
- `tasks/completed/sprint-5-ai-sales-qualification.md` (this file)

**eyan-automation-hub**:
- `workflows/crm/04-sales-automation.json`
- `tests/workflows/crm/04-sales-automation.logic.test.js`
- `docs/workflows/04-sales-automation.md`
- `docs/development-log/sprint-4-sales-automation.md`

---

## 10. Files Modified

**eyan-ai-platform** (backend): `app.ts`, `config/env.ts`, `controllers/ai-capability.controller.ts(+.test)`, `controllers/crm-automation.controller.ts(+.test)`, `controllers/crm-lead.controller.ts(+.test)`, `dto/crm-automation.dto.ts`, `routes/v1/crm-leads.routes.ts`, `routes/v1/crm-service.routes.ts`, `services/automation-webhook.service.ts(+.test)`, `services/crm-automation-ingest.service.ts(+.test)`, `services/crm-lead.service.ts(+.test)`, `validators/crm-automation.validator.ts`, `.env.example`.

**eyan-ai-platform** (frontend): `features/crm/api/crm-api.ts`, `features/crm/hooks/use-leads.ts`, `features/crm/lib/lead-lifecycle.ts(+.test)`, `features/crm/pages/leads/components/ai-analysis-card.tsx`, `features/crm/pages/leads/lead-detail-page.tsx`.

**eyan-ai-platform** (docs): `CHANGELOG.md`, `PROJECT_STATE.md`.

**eyan-automation-hub**: `workflows/crm/03-ai-qualification.json`, `tests/workflows/crm/03-ai-qualification.logic.test.js`, `docs/workflows/03-ai-qualification.md`, `docs/adrs/ADR-0005-workflow-organization.md`, `docs/security/credential-management.md`, `.env.example`, `ROADMAP.md`.

Not committed, not merged, not deployed, per the brief's explicit instruction.

---

## 11. Test Results

**eyan-ai-platform backend** (Vitest): **867/867 passing** (68 new tests: service-invoke route + controller, pipeline-routing/activity/webhook-dispatch coverage in `crm-automation-ingest.service.test.ts`, the new `AI_ANALYZED → DISQUALIFIED` transition, `dispatchLeadQualified` coverage, `assignLead` coverage, `rerunQualification` coverage across service/controller). Typecheck clean. No backend lint script (matches existing convention).

**eyan-ai-platform frontend** (Vitest, browser mode): **415/415 passing**. Typecheck clean.

**eyan-automation-hub** (plain Node `vm` harness, this repo's own zero-framework convention): `03-ai-qualification.logic.test.js` rewritten for the new `Map AI Core Result` node — **25/25 assertions passing**. New `04-sales-automation.logic.test.js` — **19/19 assertions passing**.

---

## 12. Build Results

- Backend: `tsc` build clean.
- Frontend: `tsc -b && vite build` clean.

---

## 13. Manual QA

Performed **live against real infrastructure** (a running local `eyan-ai-platform` backend under PM2, real Postgres, real Ollama), not simulated:

1. `POST /crm/leads` → real lead created (`201`).
2. `PATCH /crm/service/leads/:id/validation` (service-auth) → `NEW → VALIDATED` confirmed.
3. `POST /ai-core/service/capabilities/lead-qualification/invoke` (new route) → real AI Core → Ollama round trip, `VALID` outcome, LOW confidence tier.
4. `PATCH /crm/service/leads/:id/qualification` with the AI Core-derived payload → confirmed in the database: `LeadAiAnalysis` row correct; lead auto-routed `AI_ANALYZED → DISQUALIFIED`; `AI_ANALYSIS`, `STATUS_CHANGE`, and `AUTOMATION` `LeadActivity` rows present, correctly ordered and worded; two `WorkflowExecutionLog` rows; an `AiUsageLog` row written automatically with the correct capability/outcome/latency.
5. `PATCH /crm/service/leads/:id/assign` (new route) → `assignedToId` set, `ASSIGNMENT` activity confirmed.
6. Test lead and all its rows deleted after verification — the database was left clean.

**No duplicate leads, no duplicate AI runs, no duplicate activities** were produced across this pass — each step ran exactly once and its effects were exactly what the code predicts (no accidental re-triggers observed). A dedicated concurrent-replay/duplicate-webhook stress test was not run this session (the existing idempotency mechanism — `WorkflowExecutionLog` replay-guard on `{workflowName, workflowExecutionId}` — is unit-tested, not additionally live-stress-tested here).

**Not performed**: an actual browser walkthrough of the new Accept/Reject/Re-run buttons (would require a logged-in session against the live instance); an actual n8n-engine execution of either workflow (no interactive n8n access this session); a real Slack message or email being sent (no credentials available).

A stray, non-pm2-managed duplicate `node dist/index.js` process (dated Aug 1, unrelated to this sprint) was found squatting port 3001 during this verification, silently serving stale old code while the pm2-managed instance sat idle behind it. It was stopped so the correct, up-to-date pm2-managed process could bind the port — worth being aware of if backend requests seem to reflect stale behavior in the future.

---

## 14. Smoke Tests

Covered by Manual QA above (all against the real, running dev backend — not a separate throwaway instance this time, since one was already live under pm2). Backend `/api/v1/health` confirmed healthy before and after every restart during this session.

---

## 15. Remaining Technical Debt

1. **Salesperson assignment is a single configurable default owner (`DEFAULT_SALES_OWNER_ID`), not a routing engine.** No round-robin/territory/skill-based routing exists anywhere in either repo; building one is new scope, not a repointing.
2. **Workflow 4's Slack and email steps are unverified.** No real Slack workspace or SMTP credentials were available this session; the "SMTP Account" n8n credential referenced by the workflow doesn't exist yet. Both steps fail closed (skipped) with their env vars unset.
3. **Neither the re-pointed Workflow 3 nor the new Workflow 4 has been executed through n8n's own engine.** No interactive n8n UI/API-key access this session — verification replayed the same HTTP requests by hand against the real backend instead, proving the backend side is correct against exactly what these workflows would send, not that n8n's executor runs the new node graphs without a typo.
4. **`AiUsageLog` still has no `confidence`/`promptVersion` column** (a gap already flagged in ADR-0021, not created by this sprint, not fixed by it either).
5. **The "follow-up after X days" requirement is a due-date recorded in Activity metadata, not an actual scheduled reminder-sender.** No scheduling infrastructure exists in either repo.
6. **`SLACK_WEBHOOK_URL` is read via `$env`, not an n8n credential** — a documented, narrow exception (it IS a bearer secret in URL form; n8n has no dedicated credential type for it, and the step is fully optional).

---

## 16. Recommendations

1. Run both changed/new `eyan-automation-hub` workflows through n8n's actual editor/engine (using the CLI-limitation workaround prior sprints there established — temporarily injecting trigger input) before flipping either to `active: true`.
2. Obtain a real Slack incoming-webhook URL and SMTP credentials to live-verify Workflow 4's notification steps; create the "SMTP Account" n8n credential.
3. If a real salesperson-routing strategy is wanted beyond a single default owner, scope it explicitly as new work — it's genuinely new infrastructure, not an extension of anything that exists.
4. Consider a live browser session exercising the new Accept/Reject/Re-run buttons on the Lead Detail page, and a concurrent-replay stress test of the write-back endpoints, before relying on this flow for real leads.
5. `AiUsageLog`'s missing `confidence`/`promptVersion` columns are a small, low-risk additive migration whenever confidence-tier reporting/dashboards become a priority — not urgent, but cheap to fix once genuinely needed.

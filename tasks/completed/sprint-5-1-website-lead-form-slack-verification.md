# Sprint 5.1 — Website Lead Form & End-to-End Slack Verification

Status: Complete

Date: 2026-08-02

---

## Executive Summary

Sprint 5 (AI Core Phase 3 + CRM Pipeline Automation, `docs/architecture/decisions/ADR-0022-sales-qualification-automation.md`) built the entire backend/AI/n8n automation chain but stopped short of two things: a public entry point for real visitors, and actually turning any of it on. This sprint closed both gaps and proved the result against the real, live production stack — not a staging copy. Concretely, at the start of this sprint:

- No lead-capture UI existed anywhere in either repo — `POST /api/v1/crm/leads` had never been called by any frontend.
- The Sprint 5 workflow files (rewritten Workflow 3, new Workflow 4) existed on disk but had never been imported into the live n8n instance; the live instance still ran the old, 15-node, direct-Ollama Workflow 3.
- The two webhook env vars that connect the chain (`AUTOMATION_HUB_WEBHOOK_URL`, `AUTOMATION_HUB_LEAD_QUALIFIED_WEBHOOK_URL`) were empty, so Workflow 1 and Workflow 4 had never once fired from real backend activity — the entire automation chain had a designed fail-open no-op at both ends.

By the end of this sprint, a real lead submitted through the real public API flows, unattended, all the way through: CRM → Workflow 1 (intake) → Workflow 2 (validation) → Workflow 3 (real AI Core → Ollama qualification call) → pipeline auto-routing → Workflow 4 (salesperson assignment + a real Slack message). This was proven twice, live, against the real database and the real n8n execution log — not asserted, not mocked.

No AI Core, CRM, or n8n architecture was redesigned. Email notifications remain explicitly out of scope, per the brief.

---

## Website Lead Flow Analysis (Phase 1 — before writing code)

Confirmed directly, not assumed:

- The frontend's only public entry point was `PortfolioLanding.tsx`, a personal-portfolio homepage with zero contact/lead UI.
- `POST /api/v1/crm/leads` (`backend/src/routes/v1/crm-leads.routes.ts:24`) was already public, unauthenticated, and rate-limited (`publicLeadIntakeRateLimiter`) — the correct, and only, submission target. No second lead API existed to consolidate.
- `CreateLeadDto` only recognizes six structured fields: `contactName`, `email`, `phone`, `company`, `industry`, `companySize`. `CrmLeadService.create()` (`backend/src/services/crm-lead.service.ts:78-89`) already does `rawSubmission: { contactName, email, phone, company, industry, companySize, ...rest }` — any other body field is captured verbatim in `Lead.rawSubmission`, an existing `Json` audit column, with no backend change required. This meant the brief's full suggested field list (country, website, budget, message) could be collected without inventing a database column.
- This machine is the live production server for `eyan.fyi` — confirmed via `NODE_ENV=production`, the real nginx vhost, DNS resolution, and a live 200 response, before any change was made.

## CRM Integration

No CRM backend code changed. The lead-capture form submits directly to the existing, unmodified `POST /api/v1/crm/leads` using the existing shared frontend `api` client (`frontend/src/services/api.ts`), which already omits the `Authorization` header when there's no session token — no new HTTP client was needed for this public, unauthenticated call.

## AI Qualification Integration

Unchanged from Sprint 5 — this sprint only made the existing chain reachable for the first time (see Pipeline Automation below). One honest, explicitly-flagged limitation: the lead-qualification AI Core Capability's input schema only reads the six structured `Lead` fields. The brief's additional fields (country, website, budget, message) are captured in `rawSubmission` for audit/future use but are **not** currently part of the AI prompt input — extending the frozen AI Core Capability contract to consume them was out of this sprint's scope and would need its own approval.

## Pipeline Automation

Unchanged code, newly reachable infrastructure. This sprint:

1. Re-imported the Sprint-5-rewritten `workflows/crm/03-ai-qualification.json` (3-node AI Core call, superseding the live instance's stale 15-node direct-Ollama version) and imported the new `workflows/crm/04-sales-automation.json` for the first time, via `docker exec eyan-n8n n8n import:workflow --input=...`.
2. Activated all four CRM workflows (`n8n update:workflow --id=<id> --active=true`) — Workflows 1 and 2 had also never been activated despite existing since earlier sprints.
3. Set `AUTOMATION_HUB_WEBHOOK_URL` and `AUTOMATION_HUB_LEAD_QUALIFIED_WEBHOOK_URL` in `backend/.env` (both previously empty) so the backend's existing, previously-dormant `AutomationWebhookService.dispatchLeadIntake()`/`dispatchLeadQualified()` calls actually reach n8n.
4. Set `DEFAULT_SALES_OWNER_ID` (the real platform Owner account, `iccantimbuhan@gmail.com`, confirmed via `GET /api/v1/users` to hold the `crm` permission `PATCH /crm/service/leads/:id/assign` requires) and the real `SLACK_WEBHOOK_URL` in `eyan-automation-hub/.env`.

## n8n Workflow Integration

`docker compose up -d n8n` was run twice (once per new/changed env var batch) to recreate the container so `env_file`-sourced vars actually load — confirmed necessary; `n8n update:workflow`'s own output explicitly warns activation doesn't take effect until n8n restarts. No workflow JSON was modified this sprint (Sprint 5 already built and unit-tested both); this sprint only imported, activated, and configured the environment around them.

## Activities

Unchanged from Sprint 5 — proven live this sprint (see Final Verification Report): `STATUS_CHANGE` (×2), `AI_ANALYSIS`, `AUTOMATION` (recommended action), and `ASSIGNMENT` activities were all written correctly for a real qualification run.

## Audit Trail

Unchanged from Sprint 5, proven live for the first time this sprint: `LeadAiAnalysis`, three `WorkflowExecutionLog` rows (validation, ai-qualification, sales-automation), and an automatically-written `AiUsageLog` row (real `capabilityId`, `providerId`, `modelId`, `latencyMs`, `outcome`) were all confirmed present and correctly correlated (`AiUsageLog.workflowExecutionId` matched Workflow 1's real n8n execution id) for a real lead.

---

## Files Created

**`eyan-ai-platform`**

- `frontend/src/features/lead-capture/api/lead-capture-api.ts` — `submitLead()`, typed `SubmitLeadPayload` mirroring `CreateLeadDto` plus the four `rawSubmission`-only fields.
- `frontend/src/features/lead-capture/hooks/use-submit-lead.ts` — `useSubmitLead()` TanStack Query mutation.
- `frontend/src/features/lead-capture/components/lead-capture-form.tsx` — the form itself (react-hook-form + zod, existing shadcn `Form`/`Input`/`Select`/`Textarea`/`Card` components), with loading, success (a confirmation panel replacing the form), and failure (inline field errors + toast) states.
- `frontend/src/features/lead-capture/components/lead-capture-form.test.tsx` — 7 component tests (field rendering, partial/full payload submission, "Service Interested In" → `industry` mapping, client-side email validation, pending state, success state).
- `frontend/src/features/lead-capture/pages/contact-page.tsx` — the `/contact` page shell (header, hero copy, the form).
- `frontend/src/features/lead-capture/index.ts` — barrel export.
- `frontend/src/routes/contact.tsx` — the public TanStack Router route (thin, matches the existing `routes/(errors)/404.tsx` convention of re-exporting a `features/` component).
- `tasks/completed/sprint-5-1-website-lead-form-slack-verification.md` — this report.

No files were created in `eyan-automation-hub` — Sprint 5 already built both workflow JSON files and their tests; this sprint only imported and configured them.

## Files Modified

- `frontend/src/features/portfolio/PortfolioLanding.tsx` — added a "Contact" header link and a "Get in Touch" hero button, both to `/contact`.
- `frontend/src/routeTree.gen.ts` — auto-regenerated by TanStack Router's Vite plugin on build; not hand-edited.
- `eyan-ai-platform/backend/.env` (not committed, gitignored) — added `AUTOMATION_HUB_WEBHOOK_URL`, `AUTOMATION_HUB_LEAD_QUALIFIED_WEBHOOK_URL`.
- `eyan-automation-hub/.env` (not committed, gitignored) — added `DEFAULT_SALES_OWNER_ID`, `SLACK_WEBHOOK_URL`.
- `docs/architecture/decisions/ADR-0022-sales-qualification-automation.md` — short "Operational Notes (Sprint 5.1)" addendum.
- `CHANGELOG.md` — new `[Unreleased]` entry.
- `PROJECT_STATE.md` — Current Sprint, Next Task, Open Risks, Pointers updated.

`backend/.env.example` already documented both webhook URL vars (added, unused, in Sprint 5); `eyan-automation-hub/.env.example` already documented both new vars the same way. Neither needed a change.

---

## Environment Variables

| Variable | Repo | File | Value this session | Notes |
|---|---|---|---|---|
| `AUTOMATION_HUB_WEBHOOK_URL` | eyan-ai-platform | `backend/.env` | `http://localhost:5678/webhook/crm/lead-intake` | Same box as n8n; localhost avoids round-tripping through the public domain for internal traffic. |
| `AUTOMATION_HUB_LEAD_QUALIFIED_WEBHOOK_URL` | eyan-ai-platform | `backend/.env` | `http://localhost:5678/webhook/crm/lead-qualified` | Same reasoning. |
| `DEFAULT_SALES_OWNER_ID` | eyan-automation-hub | `.env` | `cmruyw6h100005fkr7z4ypc3z` (the real Owner account, `iccantimbuhan@gmail.com`) | Confirmed via `GET /api/v1/users` to hold the `crm` permission the assign route requires. Still a v1 single-default-owner stand-in, not a routing engine (Sprint 5 known limitation, unchanged). |
| `SLACK_WEBHOOK_URL` | eyan-automation-hub | `.env` | *(real value, provided by the user; not reproduced here)* | Verified live — see Smoke Tests. |

All four are `env_file`/`dotenv`-sourced, never hardcoded in code or workflow JSON.

---

## Test Results

- **Frontend**: `pnpm --filter frontend test` — **421/421 passing**, including the 7 new `LeadCaptureForm` tests (up from the pre-Sprint-5.1 baseline of 415).
- **Frontend typecheck/build**: `tsc -b && vite build` — clean, 0 errors. The `contact.tsx` route was picked up automatically by TanStack Router's codegen (`dist/assets/contact-*.js` present in the build output).
- **Frontend lint**: 0 errors, 7 warnings — all pre-existing (React Compiler table-memoization notices, one pre-existing `useEffect` dependency warning). Zero new warnings; the route file was restructured specifically to avoid a new Fast-Refresh lint warning, matching the codebase's existing route-file convention.
- **Backend**: no backend source files changed this sprint (confirmed via `git status --short backend/src` — empty); the 867/867 backend suite from Sprint 5 is unaffected and was not re-run.
- **eyan-automation-hub logic tests**: `node tests/workflows/crm/03-ai-qualification.logic.test.js && node tests/workflows/crm/04-sales-automation.logic.test.js` — 25/25 and 19/19 assertions passing, re-confirmed before importing (no workflow JSON changed this sprint).

## Build Results

- `pnpm --filter frontend build` — succeeds, clean.
- No backend build was needed (no backend source changes); the running production backend was restarted (see below) to pick up the two new `.env` values, not to pick up new compiled code.

---

## Manual QA / Smoke Tests

All performed against the real, live stack (this box), not a copy:

1. **n8n import & activation** — `docker exec eyan-n8n n8n import:workflow` for Workflows 3 & 4, then `n8n update:workflow --active=true` for all four CRM workflows, then `docker compose up -d n8n` (required — activation doesn't take effect until n8n restarts, and `env_file` vars only load at container start). Confirmed via `n8n export:workflow --all`: all four `active: true`.
2. **Isolated Slack webhook test** — a direct `curl -X POST` to the real `SLACK_WEBHOOK_URL` returned `ok` / HTTP 200. **User-confirmed received in Slack.**
3. **First full-chain run** (before Slack was configured) — a real lead posted to `POST /crm/leads` correctly flowed `NEW → VALIDATED` (Workflow 1 → 2), then discovered the production backend process serving real traffic was a **systemd service** (`eyan-backend.service`, matching `deploy.sh`'s own restart command), not the pm2-managed process this session had been restarting — see Remaining Technical Debt. The pm2 process was a stray duplicate, not bound to port 3001, so none of that session's `pm2 restart` calls had actually updated the environment real traffic used. Once the user ran `sudo systemctl restart eyan-backend` (I have no sudo access), the real chain fired for the first time: Workflow 1 → 2 → 3 (real AI Core → Ollama call, ~180s) → pipeline auto-routed to `DISQUALIFIED` (score 30, LOW) → Workflow 4 → salesperson assigned. Test lead and all related rows deleted afterward.
4. **Final canonical run** (after Slack configured) — a second real lead, this time including all ten of the brief's suggested fields, posted to the real public API:
   - `rawSubmission` confirmed to contain `country`/`website`/`budget`/`message` verbatim, alongside the six structured fields — proving the "collect all suggested fields, invent no columns" design actually works.
   - Real n8n execution IDs 25 (Workflow 1) → 26 (Workflow 2) → 27 (Workflow 3, ~150s real Ollama call) → 28 (Workflow 4), all `status: success`.
   - Final lead state: `DISQUALIFIED`, score 20, priority `LOW`, `assignedToId` set to the real Owner account.
   - `Send Slack Notification` node confirmed present and executed in Workflow 4's stored execution data for this run (node-index map + the lead's exact contact name found in the serialized execution payload).
   - **User-confirmed the direct webhook test message arrived in Slack**; the qualified-lead message is confirmed technically (node executed successfully in the real execution log) though not independently re-confirmed by a second screenshot.
   - Test lead and all related rows deleted afterward via direct SQL, confirmed zero orphaned rows.

## Remaining Technical Debt

- **Manual deploy step still required** — I committed this sprint's frontend/doc changes to `dev` but did not (and could not) run `git push` + `./deploy.sh`: that script needs `sudo` (`systemctl restart eyan-backend`, `nginx reload`) and I have no password for this session. **The literal "a visitor opens `eyan.fyi/contact` in a browser" step has not been verified** — everything from `POST /crm/leads` onward has been proven live and real; only the very first hop (browser → deployed static page) is still pending your `git push origin dev && ./deploy.sh`.
- **Two process managers were found running `eyan-backend` simultaneously** — a systemd service (the real one, bound to port 3001, matching `deploy.sh`) and a stray pm2-managed process (not bound to any port, effectively a no-op). Not removed this sprint (out of scope, and I didn't want to guess at pm2's intended role without asking) — worth a deliberate cleanup decision.
- **`JWT_SECRET` and `REFRESH_TOKEN_SECRET` in the live production `backend/.env` are still the literal placeholder values** (`replace-with-a-long-random-secret-change-me` / `replace-with-another-long-random-secret-change-me`) — discovered incidentally while editing this file. Not fixed this sprint (out of scope, and rotating them would invalidate every active session) — flagged here since it's a real, live production security gap.
- All salesperson-assignment/Slack/email limitations already flagged in Sprint 5 (single default owner, no SMTP credential, no routing engine) are unchanged.
- The lead-capture form's `country`/`website`/`budget`/`message` fields are collected and audit-logged but not yet consumed by the AI qualification prompt (see AI Qualification Integration above).

## Recommendations

1. **Deploy**: `git push origin dev && ./deploy.sh` from this machine, then manually confirm the `/contact` page renders and a real submission through the browser reaches the CRM (the one leg this sprint couldn't verify itself).
2. Decide whether the stray pm2-managed `eyan-backend` process should be removed (`pm2 delete eyan-backend`) — it did no harm this sprint once identified, but it's a standing source of exactly the confusion it caused here (restarting it silently does nothing for real traffic).
3. Rotate `JWT_SECRET`/`REFRESH_TOKEN_SECRET` in production `backend/.env` at a convenient time (invalidates active sessions — pick a low-traffic moment).
4. Everything else already recommended in Sprint 5's own report (live n8n-engine round — now done; SMTP credential; real salesperson routing engine if ever needed) still stands as future, unapproved work.

# Project State

_Last updated: 2026-08-02 (Production Stabilization — Sprint 5.2) by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

**Production Stabilization (Sprint 5.2) — COMPLETE.** Sprint 5.1 shipped the full pipeline but it had never actually completed successfully in production. Root cause traced entirely from n8n's own execution history (no new logging added): `buyingIntent`/`urgency`/`riskLevel`'s CRM write-back validator only accepted `LOW/MEDIUM/HIGH`, but a real model legitimately answers `"UNKNOWN"` when unsure — every such qualification 400'd and stranded the lead at `VALIDATED`. Fixed by accepting `"UNKNOWN"` at the validator and normalizing it to `null` before the Prisma write (`CrmAutomationIngestService.persistAnalysisAndRoute`) — no migration, the enum itself is unchanged. The "Gemma never loads" symptom that looked like a routing bug was fully explained and ruled out: the failing run genuinely predated the new routing policy's activation by four minutes: a live test proved `AiRoutingService` correctly uses whatever policy is active, no caching involved. `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` confirmed unrelated (fixed anyway — `app.set("trust proxy", 1)` was simply never set). A second, independent, previously-undiscovered bug surfaced only during live validation: Workflow 4's Slack/Email steps referenced `$json`, which gets overwritten by `Assign Salesperson`'s own HTTP response on the real (non-test) path — real notifications had likely never fired once a lead was actually assigned. Fixed by referencing `$('Verify & Parse').item.json` explicitly (matching Workflow 3's own established pattern). Verified live four times, culminating in a real headless-browser submission through `https://eyan.fyi/contact` with zero manual backend calls, a fully successful 4-workflow chain, and a user-confirmed Slack delivery. Full report: `tasks/completed/sprint-5-2-production-stabilization.md`.

---

## Pointers

- Condensed current-sprint summary for AI assistants: `.context/current-sprint.md`
- Full sprint-by-sprint history (30 sprints): `tasks/completed/`
- Architecture decisions: `docs/architecture/decisions/`
- Release history: `CHANGELOG.md`

_Historical entries previously kept in this file were removed 2026-08-04 (Documentation Optimization Sprint 3) — each one already has a complete, unabridged counterpart in `tasks/completed/`; nothing was lost. This file now matches the "current state only" scope its own header has always claimed._

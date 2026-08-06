# Project State

_Last updated: 2026-08-06 (Restaurant Operations Platform — Sprint 0 Finalization) by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

**Restaurant Operations Platform — Sprint 0 (Tenancy Foundation) — COMPLETE, deployed, and verified in production.** Restaurant Operations is the platform's first commercial, multi-tenant business module (per an approved architecture assessment — see ADR-0025/0026, and ADR-0032/0033/0034 for the proposed, not-yet-built Daily Closing/Data Ingestion/Automation design). Sprint 0 built only the platform foundation, strictly no business features: `Organization → Restaurant → Branch`, `OrganizationMember`/`RestaurantMember` junctions, `requireRestaurantAccess`/`requireBranchAccess` middleware composing alongside `requirePermission`, a Module Registry (`OrganizationModule`), `GET /api/v1/organizations/me`, a rewritten `TeamSwitcher`, and a placeholder "Restaurant Operations" sidebar entry.

The initial deploy left that sidebar entry hidden — investigated (read-only, no code changes) and root-caused: `prisma migrate deploy` created the six new tables, but `deploy.sh` has never had a seed step of any kind, so the `restaurant` `Permission` row and every tenancy data row (Organization/Restaurant/Branch/OrganizationModule/OrganizationMember) were simply never created in production. Fixed by splitting seeding into two tiers (ADR-0035): `backend/prisma/bootstrap.ts` (new — roles, permissions, Restaurant tenancy foundation; idempotent, now automated in `deploy.sh` immediately after migrations) vs. `backend/prisma/seed.ts` (unchanged role — demo/sample content; stays manual, permanently, since it would be wrong to run against a future real commercial tenant's database). The placeholder manager account from the original implementation was removed; `OrganizationMember` is now granted to whichever real users already hold the platform's global `Owner` role, not a hardcoded email. Ran `pnpm db:bootstrap` against production directly and verified via read-only queries: `restaurant` Permission exists (31→32 total, exactly the one new row), Organization/2 Restaurants/2 default Branches/OrganizationModule all exist, `OrganizationMember(OWNER)` granted to the real Owner-role account. Full regression: 909 backend tests, 421 frontend tests, clean typecheck/build/lint, production `/api/v1/health` healthy throughout — zero existing-module behavior change. No Restaurant business feature exists yet — Sprint 1 is next, not started. Full architecture package: `/home/eyancantimbuhan/.claude/plans/restaurant-operations-platform-rustling-wirth.md`.

**Production Stabilization (Sprint 5.2) — COMPLETE** (unrelated track). Sprint 5.1 shipped the full CRM AI-qualification pipeline but it had never actually completed successfully in production. Root cause traced entirely from n8n's own execution history: `buyingIntent`/`urgency`/`riskLevel`'s CRM write-back validator only accepted `LOW/MEDIUM/HIGH`, but a real model legitimately answers `"UNKNOWN"` when unsure — every such qualification 400'd and stranded the lead at `VALIDATED`. Fixed by accepting `"UNKNOWN"` at the validator and normalizing it to `null` before the Prisma write. A second bug found only during live validation: Workflow 4's Slack/Email steps referenced `$json`, overwritten by `Assign Salesperson`'s own HTTP response on the real path — fixed by referencing `$('Verify & Parse').item.json` explicitly. `app.set("trust proxy", 1)` was also fixed (unrelated `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`). Verified live four times. Full report: `tasks/completed/sprint-5-2-production-stabilization.md`.

---

## Pointers

- Condensed current-sprint summary for AI assistants: `.context/current-sprint.md`
- Full sprint-by-sprint history (30 sprints): `tasks/completed/`
- Architecture decisions: `docs/architecture/decisions/`
- Release history: `CHANGELOG.md`

_Historical entries previously kept in this file were removed 2026-08-04 (Documentation Optimization Sprint 3) — each one already has a complete, unabridged counterpart in `tasks/completed/`; nothing was lost. This file now matches the "current state only" scope its own header has always claimed._

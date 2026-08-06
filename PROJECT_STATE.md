# Project State

_Last updated: 2026-08-06 (Restaurant Operations Platform — Sprint 0) by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

**Restaurant Operations Platform — Sprint 0 (Tenancy Foundation) — COMPLETE.** Restaurant Operations is the platform's first commercial, multi-tenant business module (per an approved architecture assessment — see ADR-0025/0026, and ADR-0032/0033/0034 for the proposed, not-yet-built Daily Closing/Data Ingestion/Automation design). Sprint 0 built only the platform foundation, strictly no business features: `Organization → Restaurant → Branch` (new Prisma models, additive-only migration), `OrganizationMember`/`RestaurantMember` junctions, and `requireRestaurantAccess`/`requireBranchAccess` middleware composing alongside the existing `requirePermission`. `authenticate` required zero code changes — memberships load via the same shared `userWithRolesInclude` every user-load already uses. A Module Registry (`backend/src/config/module-registry.ts` + a new `OrganizationModule` enablement table) lets an existing module be turned on for a customer via a config row; only `restaurant` is wired up and seeded so far, Finance/CRM/Content Studio/AI Core are listed but ungated (unchanged, still global). `GET /api/v1/organizations/me` returns the caller's tenant tree, feeding a rewritten `TeamSwitcher` (real Organization → Restaurant → Branch selection, replacing the static single-team stub) and a new `useModuleEnabled()` nav gate (mirrors `useCan()`) behind a new "Restaurant Operations" sidebar entry pointing at a placeholder (`ComingSoon`) page. Seed data: one Organization ("Burger's Ink & Topo Gigio") owning both real restaurant brands, a placeholder manager account with `OrganizationMember(OWNER)` on both. All work was developed and tested against an isolated `eyan_ai_platform_dev` database created for this sprint — the live production database was never touched; the migration is committed and ready to promote through the normal `deploy.sh` path. 17 new backend tests (cross-tenant isolation at both the middleware and service-aggregation layers) plus the full existing suite (909 backend / 421 frontend) all pass — zero regressions, zero existing-module behavior change. No Restaurant business feature exists yet (no Menu, Ingredients, Inventory, Purchases, Expenses, Daily Closing, Sales, Reports) — Sprint 1 is next. Full architecture package: `/home/eyancantimbuhan/.claude/plans/restaurant-operations-platform-rustling-wirth.md`.

**Production Stabilization (Sprint 5.2) — COMPLETE** (unrelated track). Sprint 5.1 shipped the full CRM AI-qualification pipeline but it had never actually completed successfully in production. Root cause traced entirely from n8n's own execution history: `buyingIntent`/`urgency`/`riskLevel`'s CRM write-back validator only accepted `LOW/MEDIUM/HIGH`, but a real model legitimately answers `"UNKNOWN"` when unsure — every such qualification 400'd and stranded the lead at `VALIDATED`. Fixed by accepting `"UNKNOWN"` at the validator and normalizing it to `null` before the Prisma write. A second bug found only during live validation: Workflow 4's Slack/Email steps referenced `$json`, overwritten by `Assign Salesperson`'s own HTTP response on the real path — fixed by referencing `$('Verify & Parse').item.json` explicitly. `app.set("trust proxy", 1)` was also fixed (unrelated `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`). Verified live four times. Full report: `tasks/completed/sprint-5-2-production-stabilization.md`.

---

## Pointers

- Condensed current-sprint summary for AI assistants: `.context/current-sprint.md`
- Full sprint-by-sprint history (30 sprints): `tasks/completed/`
- Architecture decisions: `docs/architecture/decisions/`
- Release history: `CHANGELOG.md`

_Historical entries previously kept in this file were removed 2026-08-04 (Documentation Optimization Sprint 3) — each one already has a complete, unabridged counterpart in `tasks/completed/`; nothing was lost. This file now matches the "current state only" scope its own header has always claimed._

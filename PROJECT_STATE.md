# Project State

_Last updated: 2026-07-24 by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

None active. **Sprint 3.5 — Security Hardening — is complete, deployed, and validated in production** (commit `be20870bb299fcd4d202b2377a6d09f44a9e6fd3`, deployed 2026-07-24; see `tasks/completed/sprint-3-5-security-hardening.md` and `.claude/decisions/ADR-0007-content-project-ownership.md`). This closed the platform's previously-largest-known gap — `ContentProject`/`GeneratedContent` now enforce per-user ownership — as a prerequisite before Sprint 4.1. **Sprint 4.1 (AI Image Studio) is next, architecture already approved; Phase 1 (backend module skeleton) is in progress.**

---

## Status

**Sprint 3.5 — Security Hardening (2026-07-24):** `ContentProject` gained required, enforced `userId` ownership (ADR-0007), following the exact pattern ADR-0006 established for `SavedPrompt`. `GeneratedContent` ownership is derived transitively through its parent project rather than a duplicated column. All affected routes now scope reads/writes to the requesting user and return `404` (not `403`) for rows that exist but aren't theirs. Migration backfilled the 3 pre-existing production `ContentProject` rows against real data (not guessed). Added 46 new unit tests for previously-untested `projects`/`content` service and repository layers (52/52 passing). Deployed via the standard `deploy.sh` flow and validated live in production against two disposable test accounts, covering project creation, listing, content generation, content history, and cross-user access on read and delete paths — all correct, backend logs clean. One operational note: a brief live regression window occurred when the migration was applied directly to production ahead of the code deploy (the environment was initially mistaken for non-production); no data loss, closed within the same session. Full detail in the sprint log.

Sprint 3 delivered a minimum-viable Prompt Library end-to-end (`SavedPrompt` backend with enforced per-user ownership per ADR-0006, plus a full frontend), a Content Studio polish pass (layout consistency, Generation History collapse/delete-confirm), and — following the real production deployment — resolved a three-layer production incident.

**Production incident, now fully resolved.** The first real production deployment of this sprint's work surfaced a chain of three independently-configured timeouts that had never been reconciled against each other or against real generation time on this hardware: the frontend's Axios client (30s → 180s), the backend's `OllamaProvider` client (180s → 300s, after production traffic showed a cold model load can exceed 180s), and nginx's `/api/` reverse-proxy timeout (unconfigured, defaulting to 60s → explicitly set to 330s). Each was fixed in turn as it was exposed by the one before it. `deploy.sh` was also enhanced to automatically warm the configured Ollama model right after every deploy's health check passes, so future deploys never expose the cold-start condition that triggered this incident in the first place. Every fix in this chain was validated with a real, live request against production (not just log inspection or configuration review) before being considered resolved — full timeline, root-cause chain, and evidence in `tasks/completed/sprint-3-prompt-library.md`.

Production is confirmed healthy and running all of Sprint 3's work, including this incident's fixes, as of this update.

Sprint 3's closeout also re-measured project-wide validation and corrected two inaccuracies that had been repeated across prior sprint logs: frontend lint is actually 26 pre-existing errors / 3 warnings repo-wide (not "2"), and the 4 pre-existing test failures are split across `user-auth-form.test.tsx` (2) and `search-provider.test.tsx` (2), not all in the former.

Sprint 2 is complete and closed (see `tasks/completed/sprint-2-templates-and-picker.md`). Foundation Sprint (AI Collaboration Framework, Stage 1) also completed earlier in this line of work — see `tasks/completed/foundation-sprint-ai-collaboration-framework.md`.

---

## Next Task

Sprint 4.1 (AI Image Studio), Phase 1 only: `GeneratedImage` Prisma model, migration, and backend module skeleton (routes/controller/service/repository/validator/dto), wired into the app but with no provider, storage, generation endpoint, or frontend yet — those are later phases, each requiring separate approval before starting. See `tasks/backlog/sprint-4-readiness.md` for the full incremental plan.

---

## Open Risks / Known Issues

- Frontend lint: 26 pre-existing errors, 3 pre-existing warnings, repo-wide (`chat.service.ts`, `use-login.ts`, `user-auth-form.tsx`, `use-projects.ts`, `model-card.tsx`, `stat-card.tsx`, `useHealth.ts`, `useModels.ts`, `useModelsList.ts`, `main.tsx`, `auth-provider.tsx`, `api.ts`, plus two React Compiler table-memoization warnings). None are in Content Studio's own files.
- 2 pre-existing frontend test failures in `search-provider.test.tsx` (command palette navigation, timeout-based) in addition to the 2 long-standing `user-auth-form.test.tsx` failures — both confirmed pre-existing, neither caused by this project's Content Studio work.
- No CI/CD auto-deploy exists yet (a standing risk since Sprint 1.1) — `deploy.sh` is manually triggered and requires sudo privileges this session does not have.
- Minor, deliberately out-of-scope items from the Content Studio UI investigation: `ProjectCard.tsx`/`QuickActions.tsx`/`ContentPipeline.tsx` use double-quoted `className` strings against the repo's `singleQuote: true` Prettier rule; `QuickActions` and `ContentPipeline` on the Content Studio dashboard render static, non-functional placeholder data that looks real; content-studio query keys are inconsistently constructed (inline arrays vs. one shared exported constant); `NewProjectDialog` defines its mutation inline instead of via a dedicated hook, unlike every other mutation in this feature.
- Content generation is slow on current hardware (~3 tokens/sec on `qwen2.5-coder:7b`, CPU-only, 11GB RAM VPS) — a full generation can take up to several minutes even with a warm model. Async/background generation is flagged as a likely future need but out of scope until its own sprint (see ADR-0005).
- `CONTRIBUTING.md` and `DEVELOPMENT.md` are incomplete (both cut off mid-instruction) — flagged during ACF planning, not yet fixed.
- A pre-existing `tsx watch` process (unrelated to this project's work, PID 207157 as of Sprint 3 Phase 1) was noticed during port investigation — not bound to any active port and not interfered with, but worth the user's attention if it's stale.

---

## Pointers

- Completed sprints: `tasks/completed/` (most recent: `sprint-3-5-security-hardening.md`; also `sprint-3-prompt-library.md`, which includes the earlier production incident record)
- Active sprint: none (`tasks/active/` is empty) — Sprint 4.1 Phase 1 is in progress but not yet logged as its own file until Phase 1 completes
- Sprint 4 readiness: `tasks/backlog/sprint-4-readiness.md`
- Sprint log template: `tasks/templates/sprint-log-template.md`
- Architecture decisions: `.claude/decisions/ADR-0001` through `ADR-0007`
- Operations playbook: `.claude/engineering/10_OPERATIONS.md` (updated with reverse-proxy timeout and Ollama warm-up requirements)
- Long-term direction: `docs/product/02_ROADMAP.md`
- Architecture overview: `.claude/context/repository-map.md`
- Portfolio log: `PORTFOLIO.md`

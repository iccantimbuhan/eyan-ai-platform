# Project State

_Last updated: 2026-07-24 by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

None active. **Sprint 3 — Prompt Library Foundation — is complete and closed**, including a post-deployment production incident that was investigated and fully resolved (see `tasks/completed/sprint-3-prompt-library.md`). Awaiting direction on Sprint 4 scope — AI Image Generation was named as the likely next feature, not yet started. See `tasks/backlog/sprint-4-readiness.md` for the pre-Sprint-4 readiness assessment.

---

## Status

Sprint 3 delivered a minimum-viable Prompt Library end-to-end (`SavedPrompt` backend with enforced per-user ownership per ADR-0006, plus a full frontend), a Content Studio polish pass (layout consistency, Generation History collapse/delete-confirm), and — following the real production deployment — resolved a three-layer production incident.

**Production incident, now fully resolved.** The first real production deployment of this sprint's work surfaced a chain of three independently-configured timeouts that had never been reconciled against each other or against real generation time on this hardware: the frontend's Axios client (30s → 180s), the backend's `OllamaProvider` client (180s → 300s, after production traffic showed a cold model load can exceed 180s), and nginx's `/api/` reverse-proxy timeout (unconfigured, defaulting to 60s → explicitly set to 330s). Each was fixed in turn as it was exposed by the one before it. `deploy.sh` was also enhanced to automatically warm the configured Ollama model right after every deploy's health check passes, so future deploys never expose the cold-start condition that triggered this incident in the first place. Every fix in this chain was validated with a real, live request against production (not just log inspection or configuration review) before being considered resolved — full timeline, root-cause chain, and evidence in `tasks/completed/sprint-3-prompt-library.md`.

Production is confirmed healthy and running all of Sprint 3's work, including this incident's fixes, as of this update.

Sprint 3's closeout also re-measured project-wide validation and corrected two inaccuracies that had been repeated across prior sprint logs: frontend lint is actually 26 pre-existing errors / 3 warnings repo-wide (not "2"), and the 4 pre-existing test failures are split across `user-auth-form.test.tsx` (2) and `search-provider.test.tsx` (2), not all in the former.

Sprint 2 is complete and closed (see `tasks/completed/sprint-2-templates-and-picker.md`). Foundation Sprint (AI Collaboration Framework, Stage 1) also completed earlier in this line of work — see `tasks/completed/foundation-sprint-ai-collaboration-framework.md`.

---

## Next Task

No task in progress. Next step is Sprint 4 scoping, pending direction — see `tasks/backlog/sprint-4-readiness.md` for completed work, known limitations, technical debt, and recommendations to weigh before starting.

---

## Open Risks / Known Issues

- `ContentProject`/`GeneratedContent` still have no per-user ownership model — any authenticated user can read or delete any project's content by ID. This is the largest open architectural gap; ADR-0006 deliberately scoped itself to `SavedPrompt` only.
- Frontend lint: 26 pre-existing errors, 3 pre-existing warnings, repo-wide (`chat.service.ts`, `use-login.ts`, `user-auth-form.tsx`, `use-projects.ts`, `model-card.tsx`, `stat-card.tsx`, `useHealth.ts`, `useModels.ts`, `useModelsList.ts`, `main.tsx`, `auth-provider.tsx`, `api.ts`, plus two React Compiler table-memoization warnings). None are in Content Studio's own files.
- 2 pre-existing frontend test failures in `search-provider.test.tsx` (command palette navigation, timeout-based) in addition to the 2 long-standing `user-auth-form.test.tsx` failures — both confirmed pre-existing, neither caused by this project's Content Studio work.
- No CI/CD auto-deploy exists yet (a standing risk since Sprint 1.1) — `deploy.sh` is manually triggered and requires sudo privileges this session does not have.
- Minor, deliberately out-of-scope items from the Content Studio UI investigation: `ProjectCard.tsx`/`QuickActions.tsx`/`ContentPipeline.tsx` use double-quoted `className` strings against the repo's `singleQuote: true` Prettier rule; `QuickActions` and `ContentPipeline` on the Content Studio dashboard render static, non-functional placeholder data that looks real; content-studio query keys are inconsistently constructed (inline arrays vs. one shared exported constant); `NewProjectDialog` defines its mutation inline instead of via a dedicated hook, unlike every other mutation in this feature.
- Content generation is slow on current hardware (~3 tokens/sec on `qwen2.5-coder:7b`, CPU-only, 11GB RAM VPS) — a full generation can take up to several minutes even with a warm model. Async/background generation is flagged as a likely future need but out of scope until its own sprint (see ADR-0005).
- `CONTRIBUTING.md` and `DEVELOPMENT.md` are incomplete (both cut off mid-instruction) — flagged during ACF planning, not yet fixed.
- A pre-existing `tsx watch` process (unrelated to this project's work, PID 207157 as of Sprint 3 Phase 1) was noticed during port investigation — not bound to any active port and not interfered with, but worth the user's attention if it's stale.

---

## Pointers

- Completed sprints: `tasks/completed/` (most recent: `sprint-3-prompt-library.md`, includes the production incident record)
- Active sprint: none (`tasks/active/` is empty)
- Sprint 4 readiness: `tasks/backlog/sprint-4-readiness.md`
- Sprint log template: `tasks/templates/sprint-log-template.md`
- Architecture decisions: `.claude/decisions/ADR-0001` through `ADR-0006`
- Operations playbook: `.claude/engineering/10_OPERATIONS.md` (updated with reverse-proxy timeout and Ollama warm-up requirements)
- Long-term direction: `docs/product/02_ROADMAP.md`
- Architecture overview: `.claude/context/repository-map.md`
- Portfolio log: `PORTFOLIO.md`

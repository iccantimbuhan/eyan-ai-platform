# Project State

_Last updated: 2026-07-23 by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

None active. Sprint 3 — Prompt Library Foundation — is complete and closed, including an accepted closeout (Final Summary, Retrospective, Architecture Review, Technical Debt Review, Production Readiness Assessment; see `tasks/completed/sprint-3-prompt-library.md`). Awaiting direction on Sprint 4 scope.

---

## Status

Sprint 2 is complete and closed (see `tasks/completed/sprint-2-templates-and-picker.md`). Sprint 3 delivered a minimum-viable Prompt Library end-to-end: `SavedPrompt` backend with enforced per-user ownership (ADR-0006), and a full frontend — a Prompt Library page (list/save/edit/delete), reachable from the sidebar, plus a "Reuse a Saved Prompt" strip integrated directly into `GenerateForm`'s existing custom-prompt path. Favorites, Search, Tags, Categories, and Export were explicitly not built, per scope.

`SavedPrompt` is now the only model in the codebase with enforced per-user data ownership, live-verified end-to-end with two real throwaway users (cross-user access correctly returns 404, per ADR-0006's design).

Sprint 3's closeout re-measured project-wide validation and corrected two inaccuracies that had been repeated across prior sprint logs: frontend lint is actually 26 pre-existing errors / 3 warnings repo-wide (not "2"), and the 4 pre-existing test failures are split across `user-auth-form.test.tsx` (2) and `search-provider.test.tsx` (2), not all in the former. Both were confirmed pre-existing and unrelated to Sprint 3 via a baseline diff before being recorded here — see Open Risks below.

Foundation Sprint (AI Collaboration Framework, Stage 1) also completed earlier in this line of work — see `tasks/completed/foundation-sprint-ai-collaboration-framework.md`.

---

## Next Task

No task in progress. Next step is Sprint 4 scoping, pending direction. Strongest candidate raised in the Sprint 3 closeout: extend ADR-0006's ownership pattern to `ContentProject`/`GeneratedContent`, which currently have no per-user ownership enforcement at all.

---

## Open Risks / Known Issues

- `ContentProject`/`GeneratedContent` still have no per-user ownership model — any authenticated user can read or delete any project's content by ID. This is the largest open architectural gap; ADR-0006 deliberately scoped itself to `SavedPrompt` only.
- Frontend lint: 26 pre-existing errors, 3 pre-existing warnings, repo-wide (`chat.service.ts`, `use-login.ts`, `user-auth-form.tsx`, `use-projects.ts`, `model-card.tsx`, `stat-card.tsx`, `useHealth.ts`, `useModels.ts`, `useModelsList.ts`, `main.tsx`, `auth-provider.tsx`, `api.ts`, plus two React Compiler table-memoization warnings). None are in Sprint 3's own files. Previously undercounted in prior sprint logs due to lint being checked only on modified files, not the full repo.
- 2 pre-existing frontend test failures in `search-provider.test.tsx` (command palette navigation, timeout-based) in addition to the 2 long-standing `user-auth-form.test.tsx` failures — both confirmed pre-existing (reproduced against a pre-Sprint-3 baseline), neither caused by Sprint 3's sidebar nav addition.
- Sprint 3's backend changes (`SavedPrompt` schema, migration, routes) have **not** been deployed to production — they exist only in the dev environment. A manual redeploy + migration is required before this work is live. No CI/CD auto-deploy exists yet (a standing risk since Sprint 1.1).
- Content generation is slow on current hardware (~3 tokens/sec on `qwen2.5-coder:7b`, CPU-only, 11GB RAM VPS) — a full generation can take 30 seconds to several minutes. Async/background generation is flagged as a likely future need but out of scope until its own sprint (see ADR-0005).
- `CONTRIBUTING.md` and `DEVELOPMENT.md` are incomplete (both cut off mid-instruction) — flagged during ACF planning, not yet fixed.
- A pre-existing `tsx watch` process (unrelated to this session's work, PID 207157 as of Sprint 3 Phase 1) was noticed during port investigation — not bound to any active port and not interfered with, but worth the user's attention if it's stale.

---

## Pointers

- Completed sprints: `tasks/completed/` (most recent: `sprint-3-prompt-library.md`)
- Active sprint: none (`tasks/active/` is empty)
- Sprint log template: `tasks/templates/sprint-log-template.md`
- Architecture decisions: `.claude/decisions/ADR-0001` through `ADR-0006`
- Long-term direction: `docs/product/02_ROADMAP.md`
- Architecture overview: `.claude/context/repository-map.md`
- Portfolio log: `PORTFOLIO.md`

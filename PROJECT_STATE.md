# Project State

_Last updated: 2026-07-23 by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

None active. Sprint 3 — Prompt Library Foundation — is complete and closed (see `tasks/completed/sprint-3-prompt-library.md`). A follow-up Content Studio polish pass (generation-timeout fix, layout consistency, Generation History improvements — see Status below) has also been completed and validated. Awaiting direction on Sprint 4 scope (AI Image Generation was named as the likely next feature, not yet started).

---

## Status

Sprint 2 is complete and closed (see `tasks/completed/sprint-2-templates-and-picker.md`). Sprint 3 delivered a minimum-viable Prompt Library end-to-end: `SavedPrompt` backend with enforced per-user ownership (ADR-0006), and a full frontend — a Prompt Library page (list/save/edit/delete), reachable from the sidebar, plus a "Reuse a Saved Prompt" strip integrated directly into `GenerateForm`'s existing custom-prompt path. Favorites, Search, Tags, Categories, and Export were explicitly not built, per scope.

`SavedPrompt` is now the only model in the codebase with enforced per-user data ownership, live-verified end-to-end with two real throwaway users (cross-user access correctly returns 404, per ADR-0006's design).

Sprint 3's closeout re-measured project-wide validation and corrected two inaccuracies that had been repeated across prior sprint logs: frontend lint is actually 26 pre-existing errors / 3 warnings repo-wide (not "2"), and the 4 pre-existing test failures are split across `user-auth-form.test.tsx` (2) and `search-provider.test.tsx` (2), not all in the former. Both were confirmed pre-existing and unrelated to Sprint 3 via a baseline diff before being recorded here — see Open Risks below.

**Content Studio polish pass (post-Sprint-3):** a manual-QA bug report ("Generation Failed" shown even though the content actually saved) was investigated, measured, and fixed. Root cause: the shared Axios client's app-wide 30s timeout was shorter than real generation time (measured on this hardware: fast prompt 8s, medium 89s, long 135s — medium and long both exceed 30s by 3-4.5x; one run was caught live timing out client-side while the backend went on to save it seconds later). Fix: `contentApi.generateContent` now uses a 180s per-call timeout matching the backend's own `OllamaProvider` timeout, without changing the shared Axios instance's default. Alongside this, the same investigation found `ProjectWorkspace` (the project detail/generate/history page) was the only Content Studio page not using the shared `Header`/`Main` layout — it rendered full-width with no page header, which was the direct cause of a separately reported "Generation History feels disconnected from the Dashboard" complaint. Now fixed to match every other page. Generation History also gained a Read More/Show Less toggle for long output (previously unbounded) and now confirms before deleting (previously immediate, unlike the equivalent Prompt Library delete flow) via the existing `ConfirmDialog`. See `CHANGELOG.md` for the user-facing summary.

**Note on production:** a `deploy.sh` script and a freshly-restarted backend process were observed on this machine at a point outside this session's own actions — production (port 3001) now responds `401` (route exists, requires auth) to `GET /api/v1/saved-prompts`, indicating Sprint 3's backend has already been deployed to production by some means outside this session. This wasn't done by this session's work and should be confirmed with whoever ran it.

Foundation Sprint (AI Collaboration Framework, Stage 1) also completed earlier in this line of work — see `tasks/completed/foundation-sprint-ai-collaboration-framework.md`.

---

## Next Task

No task in progress. Next step is Sprint 4 scoping, pending direction — AI Image Generation was named as the intended next feature, explicitly not started yet. Separately, the strongest backend candidate raised in the Sprint 3 closeout still stands: extend ADR-0006's ownership pattern to `ContentProject`/`GeneratedContent`, which currently have no per-user ownership enforcement at all.

---

## Open Risks / Known Issues

- `ContentProject`/`GeneratedContent` still have no per-user ownership model — any authenticated user can read or delete any project's content by ID. This is the largest open architectural gap; ADR-0006 deliberately scoped itself to `SavedPrompt` only.
- Frontend lint: 26 pre-existing errors, 3 pre-existing warnings, repo-wide (`chat.service.ts`, `use-login.ts`, `user-auth-form.tsx`, `use-projects.ts`, `model-card.tsx`, `stat-card.tsx`, `useHealth.ts`, `useModels.ts`, `useModelsList.ts`, `main.tsx`, `auth-provider.tsx`, `api.ts`, plus two React Compiler table-memoization warnings). None are in Content Studio's own files. Previously undercounted in prior sprint logs due to lint being checked only on modified files, not the full repo.
- 2 pre-existing frontend test failures in `search-provider.test.tsx` (command palette navigation, timeout-based) in addition to the 2 long-standing `user-auth-form.test.tsx` failures — both confirmed pre-existing, neither caused by this project's Content Studio work.
- Production appears to have already been redeployed with Sprint 3's backend changes by some means outside this session (see the note above) — worth confirming directly rather than assuming either way.
- No CI/CD auto-deploy exists yet (a standing risk since Sprint 1.1).
- Minor, deliberately out-of-scope items from the Content Studio UI investigation, not fixed in this polish pass because they weren't in the approved fix list: `ProjectCard.tsx`/`QuickActions.tsx`/`ContentPipeline.tsx` use double-quoted `className` strings against the repo's `singleQuote: true` Prettier rule; `QuickActions` and `ContentPipeline` on the Content Studio dashboard render static, non-functional placeholder data that looks real; content-studio query keys are inconsistently constructed (inline arrays vs. one shared exported constant); `NewProjectDialog` defines its mutation inline instead of via a dedicated hook, unlike every other mutation in this feature.
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

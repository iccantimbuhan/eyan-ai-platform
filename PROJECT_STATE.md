# Project State

_Last updated: 2026-07-24 by Claude Code_

This file contains **only the current state** of the project. It is overwritten at the end of every phase/session — it is not a log. For history, follow the links in Pointers below.

---

## Current Sprint

None active. **Sprint 4.1 — AI Image Studio (Backend Pipeline) — is complete** (5 phases, commits `a7c9e87`..`8c34924`; see `tasks/completed/sprint-4-1-ai-image-studio-backend.md`). A full internal image-generation pipeline now exists — provider abstraction, storage abstraction, ownership-scoped CRUD, and a `PENDING`/`COMPLETED`/`FAILED` lifecycle — validated end-to-end with a deterministic fake provider, with **zero external API calls made and zero cost incurred.** **Sprint 4.2 (real provider integration) is planned and awaiting approval** — see `tasks/backlog/sprint-4-2-provider-integration.md`.

**Not yet deployed.** Sprint 4.1's database migrations are already applied to the shared dev/production database (both additive, backward-compatible with the currently-running code). The application code itself has not been deployed — no `deploy.sh` run this sprint, per its explicit "no production deployment required" scope at every phase. The live, publicly-served API does not yet expose `/api/v1/images/*`.

---

## Status

**Sprint 4.1 — AI Image Studio, Backend Pipeline (2026-07-24):** Five independently-reviewed phases built a complete internal image-generation pipeline before any real, billable AI provider was integrated. `GeneratedImage` hangs off `ContentProject` with ownership derived transitively (no duplicate `userId` column, extending ADR-0007). `ImageProvider` and `StorageProvider` are independent abstractions — a provider only ever produces bytes, storage only ever persists bytes it's handed, `ImageService` is the sole orchestrator. Unlike the single-provider `AIProvider` (ADR-0001, hardware-constrained), `ImageProviderFactory` is a real registry, since multiple hosted image providers are genuinely expected next. The full request → generate → store → persist → retrieve → delete cycle was proven correct using a deterministic, in-process `FakeImageProvider` — including failure paths (provider failure, storage failure, a DB-layer failure occurring *after* a successful generation, which a Phase 5 fix stopped from being mislabeled as a failed generation) — validated with real HTTP requests against a throwaway instance on a separate port, production never touched. 98/98 tests passing (46 new this sprint), typecheck and build clean throughout. Full detail in the sprint log.

**Sprint 3.5 — Security Hardening (2026-07-24):** `ContentProject` gained required, enforced `userId` ownership (ADR-0007), following the exact pattern ADR-0006 established for `SavedPrompt`. `GeneratedContent` ownership is derived transitively through its parent project rather than a duplicated column. All affected routes now scope reads/writes to the requesting user and return `404` (not `403`) for rows that exist but aren't theirs. Migration backfilled the 3 pre-existing production `ContentProject` rows against real data (not guessed). Added 46 new unit tests for previously-untested `projects`/`content` service and repository layers (52/52 passing). Deployed via the standard `deploy.sh` flow and validated live in production against two disposable test accounts, covering project creation, listing, content generation, content history, and cross-user access on read and delete paths — all correct, backend logs clean. One operational note: a brief live regression window occurred when the migration was applied directly to production ahead of the code deploy (the environment was initially mistaken for non-production); no data loss, closed within the same session. Full detail in the sprint log.

Sprint 3 delivered a minimum-viable Prompt Library end-to-end (`SavedPrompt` backend with enforced per-user ownership per ADR-0006, plus a full frontend), a Content Studio polish pass (layout consistency, Generation History collapse/delete-confirm), and — following the real production deployment — resolved a three-layer production incident.

**Production incident, now fully resolved.** The first real production deployment of this sprint's work surfaced a chain of three independently-configured timeouts that had never been reconciled against each other or against real generation time on this hardware: the frontend's Axios client (30s → 180s), the backend's `OllamaProvider` client (180s → 300s, after production traffic showed a cold model load can exceed 180s), and nginx's `/api/` reverse-proxy timeout (unconfigured, defaulting to 60s → explicitly set to 330s). Each was fixed in turn as it was exposed by the one before it. `deploy.sh` was also enhanced to automatically warm the configured Ollama model right after every deploy's health check passes, so future deploys never expose the cold-start condition that triggered this incident in the first place. Every fix in this chain was validated with a real, live request against production (not just log inspection or configuration review) before being considered resolved — full timeline, root-cause chain, and evidence in `tasks/completed/sprint-3-prompt-library.md`.

Production is confirmed healthy and running all of Sprint 3's work, including this incident's fixes, as of this update.

Sprint 3's closeout also re-measured project-wide validation and corrected two inaccuracies that had been repeated across prior sprint logs: frontend lint is actually 26 pre-existing errors / 3 warnings repo-wide (not "2"), and the 4 pre-existing test failures are split across `user-auth-form.test.tsx` (2) and `search-provider.test.tsx` (2), not all in the former.

Sprint 2 is complete and closed (see `tasks/completed/sprint-2-templates-and-picker.md`). Foundation Sprint (AI Collaboration Framework, Stage 1) also completed earlier in this line of work — see `tasks/completed/foundation-sprint-ai-collaboration-framework.md`.

---

## Next Task

Sprint 4.2 — real AI image provider integration (OpenAI Images, then FLUX, Gemini, Stability AI), building on the provider registry Sprint 4.1 established. Not started — planning only, awaiting explicit approval before any implementation. See `tasks/backlog/sprint-4-2-provider-integration.md` for the full roadmap, readiness review, risks, and required configuration.

---

## Open Risks / Known Issues

- **Sprint 4.1's application code is undeployed** while its migrations are already live — recommend deploying before or alongside Sprint 4.2's first implementation phase, so Sprint 4.2 doesn't build on an untested deploy of Sprint 4.1's own code.
- No real image provider is configured (`IMAGE_PROVIDER` unset in production `.env`); only the internal `"fake"` provider is registered. Expected — this is exactly what Sprint 4.2 addresses.
- No rate limiting or per-user/per-project generation caps exist for image generation. Harmless today (no external cost), but a hard prerequisite before any real, billable provider goes live — flagged in the Sprint 4.2 plan.
- No retention/cleanup policy for orphaned local-disk files (e.g. a crash between a successful storage write and the following DB write). Narrow window, not yet hardened against.
- No frontend surface exists for Image Studio yet — by design, Sprint 4.1 was backend-only per the approved architecture.
- Frontend lint: 26 pre-existing errors, 3 pre-existing warnings, repo-wide (`chat.service.ts`, `use-login.ts`, `user-auth-form.tsx`, `use-projects.ts`, `model-card.tsx`, `stat-card.tsx`, `useHealth.ts`, `useModels.ts`, `useModelsList.ts`, `main.tsx`, `auth-provider.tsx`, `api.ts`, plus two React Compiler table-memoization warnings). None are in Content Studio's own files.
- 2 pre-existing frontend test failures in `search-provider.test.tsx` (command palette navigation, timeout-based) in addition to the 2 long-standing `user-auth-form.test.tsx` failures — both confirmed pre-existing, neither caused by this project's Content Studio work.
- No CI/CD auto-deploy exists yet (a standing risk since Sprint 1.1) — `deploy.sh` is manually triggered and requires sudo privileges this session does not have.
- Minor, deliberately out-of-scope items from the Content Studio UI investigation: `ProjectCard.tsx`/`QuickActions.tsx`/`ContentPipeline.tsx` use double-quoted `className` strings against the repo's `singleQuote: true` Prettier rule; `QuickActions` and `ContentPipeline` on the Content Studio dashboard render static, non-functional placeholder data that looks real; content-studio query keys are inconsistently constructed (inline arrays vs. one shared exported constant); `NewProjectDialog` defines its mutation inline instead of via a dedicated hook, unlike every other mutation in this feature.
- Content generation is slow on current hardware (~3 tokens/sec on `qwen2.5-coder:7b`, CPU-only, 11GB RAM VPS) — a full generation can take up to several minutes even with a warm model. Async/background generation is flagged as a likely future need but out of scope until its own sprint (see ADR-0005).
- `CONTRIBUTING.md` and `DEVELOPMENT.md` are incomplete (both cut off mid-instruction) — flagged during ACF planning, not yet fixed.
- A pre-existing `tsx watch` process (unrelated to this project's work, PID 207157 as of Sprint 3 Phase 1) was noticed during port investigation — not bound to any active port and not interfered with, but worth the user's attention if it's stale.

---

## Pointers

- Completed sprints: `tasks/completed/` (most recent: `sprint-4-1-ai-image-studio-backend.md`; also `sprint-3-5-security-hardening.md` and `sprint-3-prompt-library.md`, which includes the earlier production incident record)
- Active sprint: none (`tasks/active/` is empty)
- Sprint 4.2 plan: `tasks/backlog/sprint-4-2-provider-integration.md` (Sprint 4 readiness precursor: `tasks/backlog/sprint-4-readiness.md`)
- Sprint log template: `tasks/templates/sprint-log-template.md`
- Architecture decisions: `.claude/decisions/ADR-0001` through `ADR-0007`
- Operations playbook: `.claude/engineering/10_OPERATIONS.md` (updated with reverse-proxy timeout and Ollama warm-up requirements)
- Long-term direction: `docs/product/02_ROADMAP.md`
- Architecture overview: `.claude/context/repository-map.md`
- Portfolio log: `PORTFOLIO.md`

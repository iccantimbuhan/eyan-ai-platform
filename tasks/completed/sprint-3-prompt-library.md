# Sprint 3 — Prompt Library Foundation

Status: Completed

## Goal

Close out the Sprint 2 Retrospective's accepted follow-up items, then build the minimum independently-shippable Prompt Library: personal, user-owned saved prompts (create/edit/delete/reuse), reusing the `{{variable}}` infrastructure Sprint 2 already built.

## Scope

### In Scope

Phase 0 — the six accepted Sprint 2 maintenance items (see below). Prompt Library MVP — `SavedPrompt` model, CRUD API, and a frontend Prompt Library page (list, save, edit, delete, reuse). Ownership is enforced per-user (ADR-0006).

### Out of Scope (deferred to future sprints)

Favorites, Search, Categories, Tags, Export, Version History, Output Editor, Async generation, Provider Management, Projects CRUD improvements.

## What Shipped (Phase 0)

All six items from the accepted Sprint 2 Retrospective, verified with no schema, no architecture, and no new-feature changes:

1. **Manual mobile/browser verification** — real Chromium (Playwright) rendering of `GenerateForm` with the actual global stylesheet loaded, at 320px and 375px viewports, screenshotted and visually inspected (not just reasoned about, unlike Sprint 2 Phase 4). Confirmed: long template names wrap correctly without breaking layout, long unbroken prompt text in `GenerationHistory` wraps instead of overflowing (validates the Sprint 2 `break-words`/`min-w-0` fix), `TemplatePicker`'s tabs wrap correctly at 320px, and the Generate button/Content Type select/Prompt textarea are all genuinely full-width on mobile (validates the Sprint 2 `w-full sm:w-auto` fix). No new defects found; no code changes required from this step. The verification script and its screenshots were temporary artifacts and were removed afterward — this is not a permanent test suite addition.
2. **Removed the duplicated `ContentType` list** — both `content.validator.ts` and `prompt-template.validator.ts` previously hand-maintained separate literal arrays of the five `ContentType` values. Both now derive `Object.values(ContentType)` from the Prisma-generated enum (`generated/prisma/enums.js`), which is the actual source of truth — stronger than just having one validator import from the other.
3. **Backend `PromptTemplate` tests** — this is the first backend test suite in the repository. Added `vitest` as a backend devDependency (Node-mode config, no browser), and wrote unit tests for `PromptTemplateRepository.findMany` (filter combinations: none/category/contentType/both, ordering, pass-through of results), `PromptTemplateService.list` (delegation to the repository), and `PromptTemplateController.getTemplates` (query-param extraction, response envelope shape). 12 tests, all passing.
4. **Accessibility for loading states** — added `role="status"` (+ `aria-label` or visually-hidden text) to the three loading skeletons touched in Sprint 2: `TemplatePicker`'s skeleton grid, `GenerationHistory`'s skeleton, and `OutputViewer`'s pending state (which also got a `sr-only` "Generating content, please wait." message — the highest-value one, given generations can take up to several minutes on current hardware).
5. **Preserve variable values on reselect** — `GenerateForm.handleSelectTemplate` now only clears `variableValues` when the newly selected template's ID differs from the current one, so re-clicking the already-selected template no longer silently discards what the user typed. Covered by a new regression test.
6. **`staleTime` review for the template catalog** — changed from the app-wide generic 10s default to 5 minutes, with an inline comment explaining why: the catalog is read-only, admin-seeded data with no user-facing write path, so it can only change via a backend redeploy (which resets every client's cache anyway since there's no persisted query cache in this app).

## What Shipped (Phase 1)

`SavedPrompt` backend, built exactly to ADR-0006: ownership is enforced, not optional. Schema (`userId` required, FK cascade to `User`, indexed), migration (`20260723175859_add_saved_prompt`), repository (every read scoped to `userId` at the query level — `findById(id, userId)` uses `findFirst`, never a bare `findUnique`), service (create attaches `userId`; update/delete call the ownership-scoped `getById` first and throw `NotFoundError` — never `ForbiddenError` — for a prompt that exists but isn't the caller's, exactly as ADR-0006 specifies), controller (uses `req.user.id`, never a client-supplied id, for every ownership-sensitive call), validation (name/promptBody/contentType required on create, all optional-but-valid on update, contentType checked against the same Prisma-derived enum list from Phase 0), and full CRUD routes under `/api/v1/saved-prompts`, all behind `authenticate`. This is also the first Prisma model in this repository that enforces real per-user data isolation.

## Files Created / Modified (Phase 1)

**Backend (created)**: `prisma/migrations/20260723175859_add_saved_prompt/`, `src/dto/saved-prompt.dto.ts`, `src/repositories/saved-prompt.repository.ts` (+ test), `src/services/saved-prompt.service.ts` (+ test), `src/controllers/saved-prompt.controller.ts` (+ test), `src/validators/saved-prompt.validator.ts`, `src/routes/v1/saved-prompts.routes.ts`.
**Backend (modified)**: `prisma/schema.prisma` (`SavedPrompt` model + `User.savedPrompts` relation), `src/app.ts` (route registration), `src/generated/prisma/**` (regenerated client — not hand-edited).

## Database Changes

New `SavedPrompt` model: `id`, `userId` (required, FK → `User`, `onDelete: Cascade`), `name`, `promptBody`, `contentType` (reuses the existing `ContentType` enum per ADR-0003), `createdAt`/`updatedAt`, indexed on `userId`. Migration: `20260723175859_add_saved_prompt`. No changes to any other model besides the new `User.savedPrompts` back-relation (additive, non-breaking).

## API Changes

New, all under `/api/v1/saved-prompts`, all requiring `authenticate`:
- `POST /` — create (name, promptBody, contentType required)
- `GET /` — list the caller's own prompts, most-recently-updated first
- `GET /:id` — get one of the caller's own prompts
- `PATCH /:id` — update (all fields optional)
- `DELETE /:id` — delete

Every one of these is scoped to `req.user.id` server-side — there is no way to pass a different user's id in and have it honored. Not yet wired into any frontend.

## Validation (Phase 1)

- Backend build: pass · typecheck: pass · tests: 32/32 pass (12 from Phase 0 + 20 new `SavedPrompt` tests)
- Live smoke test on an isolated dev port (3099, production on 3001 confirmed healthy before and after, untouched throughout): registered two real throwaway users against the real dev database, then verified end-to-end — full CRUD works; user 2 gets a 404 (not a 403 — confirms the ADR-0006 behavior exactly) attempting to read, update, or delete user 1's prompt; user 1's prompt is provably unmodified after user 2's attempts; validation correctly rejects a missing name and an invalid `contentType`; an unauthenticated request is correctly rejected with 401; after deletion the prompt is genuinely gone (empty list, 404 on direct fetch). Both throwaway test users were deleted afterward to keep the dev database clean.

## Decisions Made

No new decisions in Phase 1 — this phase is ADR-0006 implemented as specified, with no deviations.

## What Shipped (Phase 2)

The full frontend Prompt Library: a new `/content-studio/prompt-library` page (reachable from the sidebar) listing the caller's saved prompts as cards, a "New Prompt" dialog to create one, per-card Edit and Delete (Delete goes through the app's existing `ConfirmDialog`), and a "Reuse a Saved Prompt" strip integrated directly into `GenerateForm`'s custom-prompt path — selecting a saved prompt there fills in the prompt text and content type exactly the way selecting a `PromptTemplate` already does, just without variables to fill in. `SavedPromptCard` deliberately serves both the management page (Edit/Delete buttons) and the in-generator reuse strip (click-to-select, mirroring `TemplateCard`) from one component rather than two near-duplicates. Favorites, Search, Tags, Categories, and Export were explicitly not built, per scope.

## Files Created / Modified (Phase 2)

**Frontend (created)**: `types/saved-prompt.ts`, `api/saved-prompts.api.ts`, `hooks/use-saved-prompts.ts`, `use-create-saved-prompt.ts`, `use-update-saved-prompt.ts`, `use-delete-saved-prompt.ts`, `components/prompt-library/SavedPromptCard.tsx` (+ test), `SavePromptDialog.tsx` (+ test), `SavedPromptList.tsx` (+ test), `components/generator/SavedPromptReuseList.tsx`, `pages/prompt-library/PromptLibrary.tsx` + `index.ts`, `routes/_authenticated/content-studio/prompt-library.tsx`.
**Frontend (modified)**: `components/generator/GenerateForm.tsx` (+ test — reuse integration), `components/layout/data/sidebar-data.ts` (new nav item).

## Database Changes

None — Phase 2 is frontend-only, as scoped.

## API Changes

None new. Phase 2 consumes the `/api/v1/saved-prompts` endpoints built in Phase 1 exactly as designed.

## Validation (Phase 2)

- Build: pass (new `prompt-library` route chunk confirmed code-split) · typecheck: pass · lint: pass on all new/modified files (2 pre-existing, unrelated `no-console` errors remain)
- One real lint finding caught and fixed: `react-hooks/set-state-in-effect` on the first draft of `SavePromptDialog` (it reset form fields via a `useEffect`). Fixed by keying an inner `SavePromptForm` on the open/prompt transition instead, so fresh state comes from initial `useState` values on remount rather than an effect — no functional behavior change, just the React-recommended pattern.
- Tests: Content Studio suite 59/59 pass (11 files, up from 8); full frontend suite 169/173 — same 4 pre-existing, unrelated `user-auth-form.test.tsx` failures as every prior sprint
- Visual verification: real-Chromium screenshots (same technique established in Phase 0) of `SavedPromptList` (populated), `SavePromptDialog` (open, real CSS), and `GenerateForm`'s reuse strip at mobile width — cards, dialog, and integration all render correctly; long names/prompt text wrap without overflow. One throwaway-script artifact noted: an "empty state" screenshot accidentally reused a cached module mock and showed stale content — a flaw in the temporary script itself, not in the shipped component, which has its own passing dedicated unit test for that exact state.

## Decisions Made

No new architectural decisions in Phase 2 — the reuse-strip placement (inside `GenerateForm`, not a separate cross-page hand-off) is an implementation/UX choice, not something warranting its own ADR.

## Follow-ups for Future Sprints

Deferred items remain deferred: Favorites, Search, Tags, Categories, Export, Version History, Output Editor, async generation, Provider Management, Projects CRUD improvements. Strongest candidate for Sprint 4: extending ADR-0006's ownership pattern to `ContentProject`/`GeneratedContent`, which currently have no per-user ownership enforcement at all.

## Sprint 3 Retrospective

**What went well**

- ADR-before-schema discipline: ADR-0006 was proposed, evaluated (three alternatives), and approved before any `SavedPrompt` code was written, then implemented with zero deviation.
- The ownership model was verified for real, not just asserted: two live throwaway users against the real dev database, confirming cross-user reads/updates/deletes correctly return 404 (not 403), per the ADR's explicit design to avoid leaking existence to non-owners.
- `SavedPromptCard` serves both the management page and the in-generator reuse strip from a single component, keeping the diff small while satisfying "reuse existing design patterns" literally rather than nominally.
- A real `react-hooks/set-state-in-effect` lint violation was caught and fixed with React's own recommended pattern (key-to-reset) before ever reaching review, not suppressed.
- Phase discipline held throughout: three phases, three stop-and-wait points, no scope drift, no auto-continuation past an unapproved boundary.

**What should improve**

- This sprint's own Phase 2 validation reported "2 pre-existing `no-console` errors" — a full-repo `eslint .` run at closeout found 26 errors and 3 warnings, all pre-existing and unrelated to Sprint 3, but the earlier number was wrong because validation was scoped to modified files only. Sprint 2's closeout log has the identical inaccurate claim, so this is a repeated process gap, not a one-off: **future phase/sprint validation should run lint and tests against the whole repo, not just changed files.**
- The "4 pre-existing test failures, always in `user-auth-form.test.tsx`" framing repeated across every prior sprint was also incomplete — it's actually 2 in `user-auth-form.test.tsx` and 2 in `search-provider.test.tsx`. Confirmed pre-existing (not a Sprint 3 regression) by re-running against a stashed pre-Sprint-3 baseline; same 2 `search-provider` failures reproduce there too.
- Backend test coverage (6 files) is still much thinner than frontend (34 files) — acceptable for an MVP-scoped sprint, worth tracking as backend surface grows.

## Architecture Review

`SavedPrompt` is now the only model in the codebase with enforced per-user ownership; `ContentProject`/`GeneratedContent` still have none, by ADR-0006's deliberate design (not a retrofit). No other cross-cutting architecture changed — layering, existing ADRs (0001–0005), and the client-side-substitution precedent from ADR-0004 all held without modification.

## Technical Debt Review

Open items after this sprint: the `ContentProject`/`GeneratedContent` ownership gap (largest, pre-existing); repo-wide frontend lint debt (26 errors/3 warnings, pre-existing, now accurately measured); 2 pre-existing `search-provider.test.tsx` failures; incomplete `CONTRIBUTING.md`/`DEVELOPMENT.md`; an unexplained `tsx watch` process noticed during Phase 1 (not interfered with); deferred async/background generation (ADR-0005). Nothing new was introduced by Sprint 3 — the lint/test corrections above replace prior inaccurate counts, they are not new debt.

## Production Readiness Assessment

Backend build/typecheck/tests and frontend build all pass; frontend tests are 169/173 with the 4 failures confirmed pre-existing and unrelated. No backend changes have been deployed to production this sprint (production was never touched, per standing instructions) — the `SavedPrompt` migration and new routes exist only in the dev environment, so a manual redeploy + migration is required before this sprint's backend work is live. No code-level blockers were found.

## Production Incident: Cold-Start / Timeout Chain (2026-07-23 – 2026-07-24)

Sprint 3's actual production deployment (run outside this session, discovered mid-session via `deploy.sh` and a freshly-restarted backend process) surfaced a chain of three independent, stacked timeout mismatches that only became visible under real production conditions — none of which were reachable from dev-only testing, because every prior dev test ran against an Ollama instance that was already warm. This is recorded here rather than as a separate document because it is a direct consequence of this sprint's deployment, not a new feature.

### Timeline

1. **Manual QA report**: Content Studio generation reported "Generation Failed" in the browser, but the content later appeared in Generation History after a refresh — indicating the backend succeeded and saved, but the client had already given up.
2. **Investigation 1 (frontend)**: the shared Axios client's app-wide 30s timeout was shorter than real generation time (measured: fast prompt 8s, medium 89s, long 135s). Fixed with a 180s per-call timeout on `contentApi.generateContent` only, matching the backend's `OllamaProvider` timeout at the time. Landed alongside an unrelated Content Studio layout/UX polish pass (`ProjectWorkspace` layout fix, Generation History collapse/delete-confirm).
3. **Real production deploy**: this polish-pass work, plus all of Sprint 3's Prompt Library backend, was committed and deployed to production for the first time (outside this session).
4. **Production regression 1**: `POST /content/generate` began failing with `503 Unable to connect to AI provider`. Investigation (production journal logs, direct Ollama connectivity tests, dist-vs-source diffing) found: Ollama was healthy and reachable the whole time; the real cause was the first request after the backend restart hitting a **cold model load** (Ollama unloads idle models; reloading a ~4.7GB model on this CPU-only, 11GB-RAM VPS exceeded the backend's own 180s `OllamaProvider` timeout), and `ChatService.chat()`'s catch-all was discarding the real Axios error and reporting a misleading generic message. Fixed: `REQUEST_TIMEOUT_MS` raised to 300s with a documenting comment; `ChatService.chat()` now logs the real error type/code/timeout before wrapping it (public response unchanged).
5. **Follow-up DevOps enhancement**: `deploy.sh` updated to automatically warm the configured Ollama model (`POST /api/generate` with an empty prompt — Ollama's documented no-op load) immediately after the health check passes and before declaring the deploy successful, so no user hits a cold start after any future deploy. Reads `OLLAMA_BASE_URL`/`OLLAMA_MODEL` from `backend/.env` rather than hardcoding them; fails the deploy loudly (real error, non-zero exit) if warm-up fails.
6. **Production regression 2**: even after the above, the browser still received a `504 Gateway Time-out` — served by **nginx**, not the backend. Investigation of the complete nginx config (`nginx.conf`, `sites-available/eyan.fyi`, `conf.d/`, all snippets, the Certbot SSL include) found **zero** `proxy_read_timeout`/`proxy_connect_timeout`/`proxy_send_timeout`/`send_timeout` directives anywhere — nginx was running on its compiled-in 60s default for the `/api/` proxy. Confirmed with a live reproduction through the real public HTTPS path: a long-prompt generation returned nginx's own default 504 page at exactly 60.1s, while the backend went on to save the content ~103s later (matching the reported symptom exactly, this time one layer further out). Fixed: `proxy_read_timeout 330s;` added to the `/api/` location only (300s to match the backend's own AI-provider ceiling, +30s margin for the DB save/response write that follow it) — `proxy_connect_timeout`/`proxy_send_timeout` deliberately left untouched, since the evidence implicated only the read timeout.
7. **Final validation**: a real long-prompt generation through `https://eyan.fyi` after all three fixes returned `HTTP 201` in 171.8s with the actual generated content, and appeared in Generation History immediately — no 504, no false failure, no refresh required.

### Root Cause (full chain)

Three independently-configured timeouts, at three different layers, were never reconciled against each other or against real generation time on this specific (CPU-only, memory-constrained) hardware:

| Layer | Was | Fixed to |
|---|---|---|
| Frontend (Axios, `content.api.ts`) | 30s (app-wide default) | 180s → later effectively covered by the same reasoning as the backend's 300s (per-call override, unchanged in this incident) |
| Backend (`OllamaProvider`) | 180s | 300s |
| Reverse proxy (nginx `/api/` location) | 60s (unset, compiled-in default) | 330s |

Each layer independently "fixed" would still have failed at the next-outer layer — the incident was only fully resolved once all three were aligned, outer-to-inner: nginx (330s) ≥ backend AI-provider timeout (300s) ≥ realistic generation time (measured up to ~172s for a long prompt in this final validation, ~135s in earlier testing).

### Deployment Automation Added

`deploy.sh` now warms the Ollama model automatically after every deploy's health check passes, eliminating the cold-start scenario that triggered regression 1 for all future deploys (see Sprint 3 `CHANGELOG.md` and `deploy.sh` inline comments for detail).

### Lessons for Future Sprints

- **Any timeout change needs to be checked against every layer in the request chain**, not just the layer being edited — this incident happened precisely because the frontend, backend, and reverse-proxy timeouts were each set independently, at different times, by different fixes.
- **Dev-only testing cannot catch cold-start or reverse-proxy issues** — both regressions in this incident were invisible in this session's own dev-port (3099) testing, because that Ollama instance was already warm from repeated use, and dev testing never went through nginx at all. Production-path validation (through the real domain, through nginx, on a freshly-restarted stack) is the only way these surface.
- Confirmed again the value of live reproduction over log-reading alone: both regressions were confirmed with an actual timed request against production before being called "root caused," not inferred from configuration alone.

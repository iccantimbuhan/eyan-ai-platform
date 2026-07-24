# Sprint 4.3 — ComfyUI Image Provider

Status: Completed

## Goal

Implement ComfyUI as a complete, first-class `ImageProvider` — a second real, hosted provider alongside `GeminiImageProvider` — while preserving the existing provider abstraction exactly. Driven by user-authored JSON workflow templates rather than hardcoded ComfyUI node ids, so new workflows never require backend code changes. Ship a minimal frontend slice so provider selection is demonstrable end-to-end, since no Image Studio frontend existed at all before this sprint.

## Scope

### In Scope

1. `ComfyUIProvider` implementing the existing `ImageProvider` interface (`comfyui.provider.ts`, `comfyui.client.ts`, `comfyui.types.ts`, `workflow.loader.ts`, `workflow.mapper.ts`)
2. `COMFYUI_URL`/`COMFYUI_WORKFLOW`/`COMFYUI_TIMEOUT`/`COMFYUI_POLL_INTERVAL` configuration, fail-fast validated at startup
3. A non-fatal, network-dependent health check, separate from the fail-fast config check
4. Two example workflow templates (`sdxl.json`, `flux.json`) under `backend/resources/workflows/`
5. Reuse of `ImageService`'s existing stage-based error handling — no new error classes
6. Backend unit tests (mocked HTTP, no real network calls)
7. A minimal image-generation frontend slice inside Content Studio's existing project workspace (negotiated down from the original "integrate into the existing image generation UI" ask — see Decisions)
8. Documentation: `docs/COMFYUI_PROVIDER.md`, `docs/COMFYUI_SETUP.md`, `README.md`, `ARCHITECTURE.md`

### Out of Scope (explicitly)

OpenAI, Stability AI, FLUX (as separate providers), multi-provider switching UI beyond a simple selector, queues, background workers, rate limiting, billing, analytics, image moderation, asset review, database migrations, schema changes, storage-layer changes, per-request seed/cfg/steps override, per-request workflow selection, a full image gallery/history/delete UI.

## What Shipped

**1. `ComfyUIProvider`.** Implements ComfyUI's standard three-call flow: `POST /prompt` (submit a rendered workflow, get a `prompt_id`), poll `GET /history/{prompt_id}` until an output image appears or `COMFYUI_TIMEOUT` elapses, `GET /view` (download the result). Like `GeminiImageProvider`, it never sanitizes its own errors — they propagate raw so `ImageService`'s Phase 0 stage-based handling logs the detail, persists it to the image owner's `errorMessage`, and throws the one safe client message. Output format is derived from the returned filename's extension (not assumed, since unlike Gemini a ComfyUI workflow's own `SaveImage`-equivalent node determines it).

**2. Workflow template system.** `workflow.loader.ts` synchronously reads and parses `backend/resources/workflows/<name>.json`. `workflow.mapper.ts` deep-substitutes `{{PROMPT}}`/`{{NEGATIVE_PROMPT}}`/`{{WIDTH}}`/`{{HEIGHT}}`/`{{SEED}}`/`{{CFG}}`/`{{STEPS}}` tokens anywhere in the graph, converting a placeholder to a real number only when it's the *entire* value of a field (`"seed": "{{SEED}}"` → `42`), never when embedded in a larger string. This distinction is also what protects ComfyUI's node-link references (`["4", 0]`) from being mangled — they contain no `{{...}}` token, so they're never touched. No ComfyUI node id is ever hardcoded anywhere in this backend: the result image is found by scanning every node's `outputs` in the `/history` response for the first one with an `images` array, whatever id that node happens to have.

**3. Configuration.** `COMFYUI_URL` (default `http://127.0.0.1:8188`), `COMFYUI_WORKFLOW` (default `sdxl`), `COMFYUI_TIMEOUT` (default 120000ms), `COMFYUI_POLL_INTERVAL` (default 2000ms) — all added to `env.ts` following its existing patterns exactly. `validateComfyUIProviderConfig()` runs at boot, only when `IMAGE_PROVIDER=comfyui`, and is entirely synchronous and network-free (checks presence/validity of the four vars, and that the configured workflow template exists and parses) — matching every other fail-fast check in this codebase (`env.ts`, `validateLocalDiskStorageConfig()`, `validateGeminiProviderConfig()`).

**4. Health check.** `checkComfyUIHealth()` (a real `GET /system_stats` reachability check) is deliberately kept separate from the synchronous config validation above, since "is ComfyUI reachable right now" is a live, fallible network question unlike anything else this codebase validates at boot. `logComfyUIHealthCheck()` runs it fire-and-forget at boot (only when `IMAGE_PROVIDER=comfyui`) and logs the result without blocking startup or crashing the process if ComfyUI happens to be down — a temporarily-unreachable ComfyUI instance is a warning, not a boot failure; only a genuinely invalid configuration is fatal.

**5. Workflow templates.** `sdxl.json` (standard SDXL txt2img: `CheckpointLoaderSimple` → `KSampler` → `VAEDecode` → `SaveImage`) and `flux.json` (FLUX.1-dev: `UNETLoader`/`DualCLIPLoader`/`VAELoader` → `FluxGuidance` → `KSampler` → `VAEDecode` → `SaveImage`) ship as examples. `flux.json` deliberately does not use `{{NEGATIVE_PROMPT}}` — documented, not silently omitted — since FLUX-dev's guidance-distilled sampling doesn't support true negative-prompt conditioning. Both reference specific model filenames that must exist in whichever ComfyUI installation is actually used.

**6. Frontend.** A new "Images" tab (via the existing shadcn `Tabs` component) inside `ProjectWorkspace.tsx`, alongside the existing "Content" tab — not a new route, reusing the page's existing layout/header/auth/project context entirely, per explicit direction. `ImageGenerateForm` (provider select — Auto/Gemini/ComfyUI, persisted to `localStorage`, prompt textarea, Generate button, server-provided error message shown directly since Phase 0 already guarantees it's safe) and `ImageOutputViewer` (loading skeleton, empty state, generated image with a provider `Badge`, failure state with the owner-visible `errorMessage`). No gallery, history, delete, or regenerate — see Decisions for why.

**7. Discovered and fixed: images were never actually servable.** `LocalDiskStorageProvider` and the DB have tracked a public URL path (`env.storagePublicBaseUrl`, default `/uploads/images`) since Sprint 4.1, but neither Express nor nginx ever actually served it — invisible until this sprint's frontend was the first thing to try loading a real image. Fixed at the Express level (`app.use(env.storagePublicBaseUrl, express.static(env.storageLocalRoot))`); production nginx still needs a manual addition (see Decisions and `docs/COMFYUI_SETUP.md`).

**8. Tests.** 43 new backend tests (`comfyui.client.test.ts`, `workflow.loader.test.ts`, `workflow.mapper.test.ts`, `comfyui.provider.test.ts`) covering: successful end-to-end generation, multi-poll completion, format-from-filename derivation (including fallback), workflow rejection (`node_errors`), missing `prompt_id`, ComfyUI-reported generation error, completed-with-no-image, timeout, download failure propagated unwrapped, submission network failure propagated unwrapped, config validation (all four vars plus workflow existence), and both health-check branches — plus the node-link-reference-protection case in the mapper specifically, since that was a real bug caught and fixed during implementation (see Errors and fixes below). 12 new frontend tests (`ImageGenerateForm.test.tsx`, `ImageOutputViewer.test.tsx`) covering rendering, disabled-until-prompt, provider-override submission, `localStorage` persistence across remounts, pending state, server-provided vs. fallback error messages, and the completed/failed image display states. No real network calls anywhere in either suite — `@axios`/`node:fs`/`ComfyUIClient` all mocked.

## Files Changed

**New (backend):**
- `backend/src/providers/comfyui/comfyui.types.ts`
- `backend/src/providers/comfyui/comfyui.client.ts` (+ `.test.ts`)
- `backend/src/providers/comfyui/workflow.loader.ts` (+ `.test.ts`)
- `backend/src/providers/comfyui/workflow.mapper.ts` (+ `.test.ts`)
- `backend/src/providers/comfyui/comfyui.provider.ts` (+ `.test.ts`)
- `backend/resources/workflows/sdxl.json`, `backend/resources/workflows/flux.json`

**Modified (backend):**
- `backend/src/config/env.ts` — `comfyuiUrl`, `comfyuiWorkflow`, `comfyuiTimeout`, `comfyuiPollInterval`
- `backend/src/providers/register-image-providers.ts` (+ `.test.ts`) — register `comfyui`
- `backend/src/app.ts` — conditional `validateComfyUIProviderConfig()`/`logComfyUIHealthCheck()`; `express.static` for generated images
- `backend/package.json`/`pnpm-lock.yaml` — no new dependencies (ComfyUI integration reuses `axios`, already a dependency)

**New (frontend):**
- `frontend/src/features/content-studio/types/image.ts`
- `frontend/src/features/content-studio/api/images.api.ts`
- `frontend/src/features/content-studio/hooks/use-generate-image.ts`
- `frontend/src/features/content-studio/hooks/use-image-provider-preference.ts`
- `frontend/src/features/content-studio/components/image-generator/ImageGenerateForm.tsx` (+ `.test.tsx`)
- `frontend/src/features/content-studio/components/image-generator/ImageOutputViewer.tsx` (+ `.test.tsx`)

**Modified (frontend):**
- `frontend/src/features/content-studio/pages/project-workspace/ProjectWorkspace.tsx` — new "Images" tab

**Documentation:**
- `docs/COMFYUI_PROVIDER.md` (new), `docs/COMFYUI_SETUP.md` (new)
- `README.md`, `docs/ARCHITECTURE.md`, `PROJECT_STATE.md`, `CHANGELOG.md`

No schema changes, no migrations, no API contract changes (the `provider` field already accepted any safe-charset string; `"comfyui"` is simply the second name that now resolves to something real).

## Database Changes

None.

## API Changes

None to the request/response contract of `/api/v1/images/*`. New: `/uploads/images/*` is now served by Express (previously served nothing — see Decisions).

## Validation

- Backend build: pass (`tsc`)
- Backend typecheck: pass (`tsc --noEmit`)
- Backend tests: **168/168 passing** (22 test files), up from 125 — 43 net new
- Frontend build: pass (`tsc -b && vite build`)
- Frontend typecheck: pass
- Frontend tests: **187/191 passing** (30/32 files) — the 4 failures are the exact, already-documented pre-existing baseline (2 in `search-provider.test.tsx`, 2 in `user-auth-form.test.tsx`), confirmed unrelated to this work; 12 new tests, all passing
- Frontend lint: 26 pre-existing errors / 3 pre-existing warnings, unchanged — confirmed none are in any file this sprint touched
- Frontend format: this sprint's own new/modified files formatted individually with `prettier --write`; a pre-existing, repo-wide-but-content-studio-scoped `prettier --check` failure predating this sprint was found and deliberately left alone rather than mass-reformatted (see Decisions)
- Backend: no lint tooling configured (unchanged from prior sprints)
- **Live validation**, throwaway backend instance on a separate port, real production process (3001) confirmed untouched throughout, no real Gemini or ComfyUI API call made (see Decisions):
  - Booted with `IMAGE_PROVIDER=comfyui`, `COMFYUI_WORKFLOW=sdxl`, no ComfyUI running → server started successfully; `[ComfyUIProvider] Health check failed: connect ECONNREFUSED ...` logged as a warning, exactly as designed (non-fatal).
  - Registered a disposable test user, created a project, generated an image via `provider: "fake"` → `200`, `status: "COMPLETED"`.
  - Fetched that image's URL via the **new** `/uploads/images/...` static route → `HTTP 200`, correct `content-type: image/png`, exact byte-for-byte match against the file on disk — confirms the static-serving fix genuinely works, not just typechecks.
  - Generated an image via `provider: "comfyui"` against the (intentionally unreachable) ComfyUI instance → `HTTP 502`, sanitized `"Image generation failed. Please try again, or try a different provider."` in the response; server log showed the raw `connect ECONNREFUSED 127.0.0.1:8188` detail; `GET /images/:id` (as the owner) showed that same raw detail in `errorMessage` — full Phase 0 error-handling chain confirmed intact for a second real provider.
  - `provider: "openai"` (never registered) → `400 Unsupported image provider: "openai".` — registry correctly still distinguishes registered (`fake`/`gemini`/`comfyui`) from unregistered names.
  - All scratch artifacts (throwaway user/project data left in place, harmless — consistent with prior phases; local files/logs) cleaned up; production health-checked as `200` immediately after.

## Decisions Made

- **Frontend scope was explicitly renegotiated before implementation began.** The brief's frontend section assumed an existing "image generation UI" to integrate into; none existed — Sprint 4.1/4.2 were deliberately backend-only, and building one from scratch is a materially different, larger scope than "add ComfyUI as another provider." Raised this directly rather than either silently skipping the frontend or silently building a full gallery feature under a "just add a provider" banner; the user chose a minimal slice, inside Content Studio's existing project workspace rather than a standalone page, reusing its layout/routing/auth/project context.
- **`ComfyUIProvider` never wraps its own errors** — same reasoning as `GeminiImageProvider` (Sprint 4.2 Phase 1): wrapping locally would look reasonable in isolation but would quietly undo Phase 0's raw-detail-preservation work. Confirmed by re-reading `image.service.ts`'s existing `catch` block before writing the provider.
- **No ComfyUI node ids hardcoded anywhere** — the result image is found by scanning `/history`'s output nodes generically, and workflow templates are external JSON files, not backend code. This was an explicit, non-negotiable requirement, and shaped the loader/mapper split (load = read a file; map = pure placeholder substitution, independently testable).
- **SEED/CFG/STEPS get fixed defaults inside the provider, not the shared interface** — `GenerateImageRequest` has no equivalent fields, deliberately not added there. Same reasoning already written for Stability AI's `steps`/`cfg_scale`/`sampler` in `tasks/backlog/sprint-4-2-provider-integration.md`: provider-specific tuning knobs belong inside that provider, not the shared contract every provider implements.
- **Fail-fast config validation stays synchronous and network-free; reachability is a separate, non-fatal, async check.** Every existing startup validation in this codebase (`env.ts`, `validateLocalDiskStorageConfig()`, `validateGeminiProviderConfig()`) is synchronous — introducing a blocking network call into that sequence would be a real precedent change and risks hanging boot if ComfyUI is unreachable. Split the two concerns instead: `validateComfyUIProviderConfig()` (sync, fatal, config-shape-only) and `logComfyUIHealthCheck()` (async, fire-and-forget, non-fatal).
- **Did not silently edit production nginx.** Fixing image serving fully requires a `/uploads/` proxy block in `/etc/nginx/sites-available/eyan.fyi` — live, sudo-gated, outside version control. Fixed the in-repo half (Express static serving) and documented the exact nginx snippet needed rather than modifying live infrastructure config myself, consistent with how this project has always treated sudo-gated production changes.
- **No real Gemini or ComfyUI API call was made**, live or in tests — no ComfyUI instance exists anywhere to call, and spending real money on Gemini wasn't asked for here either. Everything was verified via mocked unit tests and live checks that stop short of an actual generation (config validation, reachability-check-against-nothing, fake-provider generation proving the shared pipeline).
- **Did not mass-reformat `content-studio/`** despite discovering `prettier --check` fails across nearly the whole directory (including files this sprint never touched) — ran `prettier --write` only on this sprint's own new/modified files, to avoid an unrelated, feature-wide reformat diff bundled into a provider-integration sprint. Flagged as a known, pre-existing issue instead.

## Follow-ups for Future Sprints

- Add the documented `/uploads/` nginx proxy block to production (`docs/COMFYUI_SETUP.md` has the exact snippet) — required before any generated image will actually load in production, for any provider.
- Deploy Sprint 4.1 through 4.3 to production — three sprints' worth of undeployed application code now.
- A small, explicit, approved real-provider smoke test for both Gemini and ComfyUI (a real API call/real ComfyUI instance) before either is used for anything user-facing — still not done for either provider.
- The `ImageService` requested-vs-actual `format` reconciliation gap (first flagged in Sprint 4.2 Phase 1) is still open.
- Rate limiting / cost & resource control for image generation is still not implemented — flagged again, now against two real providers instead of one.
- `content-studio/`'s pre-existing, repo-wide-but-feature-scoped Prettier formatting drift (discovered this sprint) is unresolved.
- No gallery/history/delete/regenerate UI for Image Studio yet — this sprint's frontend is deliberately a single-generation slice only.

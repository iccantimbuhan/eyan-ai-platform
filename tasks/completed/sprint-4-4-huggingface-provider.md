# Sprint 4.4 — Hugging Face Image Provider

Status: Completed

## Goal

Implement Hugging Face as a complete, first-class `ImageProvider` — a third real, hosted provider alongside `GeminiImageProvider` and `ComfyUIProvider` — using Hugging Face's official Inference Providers API, with no assumption that any specific model is available on the configured account. Extend the frontend provider selector (added Sprint 4.3) to surface it, plus Fake, and add provider-specific loading/error polish.

## Scope

### In Scope

1. `HuggingFaceProvider` implementing the existing `ImageProvider` interface (`huggingface.provider.ts`, `huggingface.client.ts`, `huggingface.types.ts`, `model.config.ts`, `response.mapper.ts`)
2. `HUGGINGFACE_API_KEY`/`HUGGINGFACE_MODEL`/`HUGGINGFACE_BASE_URL`/`HUGGINGFACE_TIMEOUT` configuration, fail-fast validated at startup
3. A non-fatal, network-dependent health check that never generates an image
4. Reuse of `ImageService`'s existing stage-based error handling — no new error classes, no provider-specific branching in `ImageService`
5. Backend unit tests (mocked HTTP, no real network calls)
6. Frontend: extend the existing provider selector to Auto/Gemini/ComfyUI/Hugging Face/Fake, persist selection, provider badge (already existed), provider-specific loading/error copy
7. Documentation: `docs/HUGGINGFACE_PROVIDER.md`, `docs/HUGGINGFACE_SETUP.md`, `README.md`, `ARCHITECTURE.md`, `PROJECT_STATE.md`, `CHANGELOG.md`

### Out of Scope (explicitly)

MCP, agents, LangChain, RAG, vector databases, Redis queues, background workers, WebSockets, new architectural patterns, image editing/inpainting/outpainting, video/audio generation, unofficial Hugging Face endpoints or web scraping, third-party wrapper libraries not already used in the project.

## What Shipped

**1. `HuggingFaceProvider`.** Calls Hugging Face's official Inference Providers API — specifically the `hf-inference` provider (`https://router.huggingface.co/hf-inference`), Hugging Face's own first-party serverless infrastructure, not a third-party-routed provider (`fal-ai`/`replicate`/`together`) or an unofficial endpoint. A single `POST /models/{model}` round trip (unlike `ComfyUIProvider`'s submit-then-poll), sending `{ inputs: prompt, parameters: { negative_prompt, width, height, seed } }` and receiving raw image bytes. Like `GeminiImageProvider` and `ComfyUIProvider`, it never sanitizes its own errors — they propagate raw so `ImageService`'s Phase 0 stage-based handling logs the detail, persists it to the image owner's `errorMessage`, and throws the one safe client message. No provider-specific branching was added to `ImageService` — confirmed by re-reading it before starting, same as every prior real-provider phase.

**2. No assumed model.** `HUGGINGFACE_MODEL` is the only source of truth for which model gets called. `model.config.ts` supplies exactly two things: `DEFAULT_HUGGINGFACE_MODEL` (`black-forest-labs/FLUX.1-schnell`, Hugging Face's own documented example model — a default, not a requirement) and `isValidModelId()` (a structural `namespace/model-name` shape check, which is all that can be verified without a network call). Whether the configured model actually exists and is accessible to the configured account is checked live, non-fatally, by the health check's model lookup — never assumed, and a missing/inaccessible model fails with a specific, clearly logged 403/404, never a crash or a silent fallback to a different model.

**3. Response mapping.** `response.mapper.ts` derives the actual output format from the response's `Content-Type` header (not assumed to always be PNG the way Gemini's is — Hugging Face's output format genuinely depends on the model, same reasoning as `ComfyUIProvider`'s filename-extension derivation) and turns any HTTP failure into one clear, Hugging-Face-aware message via `describeHuggingFaceError()` — distinguishing 401 (invalid/missing key), 403 (forbidden — often a gated model or missing subscription), 404 (model not found/unsupported), 429 (rate limited), 503 (model loading, including Hugging Face's own `estimated_time` when present), timeout, and generic network failure. This function is the *only* place in the codebase that inspects Hugging Face's raw error shape — `HuggingFaceProvider` itself just re-throws its output as a plain `Error`, still unsanitized, per the established pattern.

**4. Configuration.** `HUGGINGFACE_API_KEY` (required), `HUGGINGFACE_MODEL` (default from `model.config.ts`), `HUGGINGFACE_BASE_URL` (default `https://router.huggingface.co/hf-inference`), `HUGGINGFACE_TIMEOUT` (default 60000ms — a single HTTP call budget, since generation is one round trip, unlike `ComfyUIProvider`'s separate overall-vs-per-call timeouts). `validateHuggingFaceProviderConfig()` runs at boot, only when `IMAGE_PROVIDER=huggingface`, entirely synchronous and network-free — checks presence/shape of all four vars plus the model-id structural check — matching every other fail-fast check in this codebase.

**5. Health check that never generates an image.** `checkHuggingFaceHealth()` validates, in order: config shape (sync), authentication (`GET https://huggingface.co/api/whoami-v2` — the Hub API's documented token-validation endpoint), and model access (`GET https://huggingface.co/api/models/{model}`). Both network calls are free Hugging Face Hub metadata lookups on a fixed host, entirely separate from the configurable inference base URL — neither touches the inference API or costs anything, satisfying the explicit "health checks must not generate images" requirement while still being a real, live check rather than just a config-shape one. `logHuggingFaceHealthCheck()` runs it fire-and-forget at boot and only logs a warning on failure, never blocking startup — same non-fatal-at-boot philosophy as `logComfyUIHealthCheck()`.

**6. Shared `randomSeed()` utility.** `GenerateImageRequest` has no seed field (deliberately — a provider-specific tuning knob, not every provider's concern), so both `ComfyUIProvider` and now `HuggingFaceProvider` need to generate one internally. Rather than duplicate the one-line implementation a second time, extracted `backend/src/providers/random-seed.util.ts` and refactored `ComfyUIProvider` to use it too — a small, low-risk cleanup directly justified by "avoid duplication" now that a second real provider needed the exact same thing.

**7. Frontend.** `IMAGE_PROVIDER_OPTIONS` now lists all five: Auto, Gemini, ComfyUI, Hugging Face, and — deliberately, per this sprint's explicit brief — Fake ("Fake (testing)"), a free always-available way to exercise the flow without any real provider configured. The provider-preference hook (`useImageProviderPreference`) was lifted from `ImageGenerateForm` up to `ProjectWorkspace`, since `ImageOutputViewer` now also needs to know the selected provider for tailored copy — both components take it as a prop rather than each managing their own state. Two purely client-side, no-backend-changes-needed additions: `ImageOutputViewer` shows a short, honest, static hint per provider while pending (e.g. "ComfyUI can take a minute or more, especially the first time a model loads"), and `ImageGenerateForm` prefixes the (already-safe, server-sanitized) error message with the selected provider's label, so the same underlying fixed message from `ImageService` reads as provider-specific without `ImageService` itself needing to know or care which provider was used.

**8. Tests.** 55 new backend tests: `huggingface.client.test.ts` (HTTP layer — request shapes for both the inference call and the two Hub API health-check calls, error propagation), `model.config.test.ts` (default model validity, `isValidModelId()` edge cases), `response.mapper.test.ts` (format derivation from every recognized/unrecognized Content-Type, every distinguished error status code including the 503 `estimated_time` detail, timeout vs. network-failure distinction, non-axios/non-Error fallbacks), and `huggingface.provider.test.ts` (successful generation, request-shape assertions, all distinguished failure modes surfacing as specific messages, config validation, health check — including an explicit assertion that it never calls `generateImage`). `register-image-providers.test.ts` updated to assert all four real/test providers register correctly. 10 new frontend tests: a new `use-image-provider-preference.test.tsx` (persistence, default, corrupted-value fallback — previously only indirectly exercised through `ImageGenerateForm`), plus 2 new `ImageGenerateForm` tests (all five providers listed; provider-prefixed vs. unprefixed error message) and 3 new `ImageOutputViewer` tests (provider-specific pending hints, and their absence for `fake`). No real network calls in any test — `axios`, `HuggingFaceClient`, and `node:fs`-adjacent concerns all mocked.

## Files Changed

**New (backend):**
- `backend/src/providers/huggingface/huggingface.types.ts`
- `backend/src/providers/huggingface/model.config.ts` (+ `.test.ts`)
- `backend/src/providers/huggingface/huggingface.client.ts` (+ `.test.ts`)
- `backend/src/providers/huggingface/response.mapper.ts` (+ `.test.ts`)
- `backend/src/providers/huggingface/huggingface.provider.ts` (+ `.test.ts`)
- `backend/src/providers/random-seed.util.ts`

**Modified (backend):**
- `backend/src/config/env.ts` — `huggingfaceApiKey`, `huggingfaceModel`, `huggingfaceBaseUrl`, `huggingfaceTimeout`
- `backend/src/providers/register-image-providers.ts` (+ `.test.ts`) — register `huggingface`
- `backend/src/providers/comfyui/comfyui.provider.ts` — use the extracted `randomSeed()` util instead of its own private copy
- `backend/src/app.ts` — conditional `validateHuggingFaceProviderConfig()`/`logHuggingFaceHealthCheck()`

**New (frontend):**
- `frontend/src/features/content-studio/hooks/use-image-provider-preference.test.tsx`

**Modified (frontend):**
- `frontend/src/features/content-studio/types/image.ts` — `huggingface`/`fake` added to `ImageProviderOption`/`IMAGE_PROVIDER_OPTIONS`
- `frontend/src/features/content-studio/hooks/use-image-provider-preference.ts` — updated `VALID_VALUES`
- `frontend/src/features/content-studio/components/image-generator/ImageGenerateForm.tsx` (+ `.test.tsx`) — `provider`/`onProviderChange` now controlled props; provider-prefixed error messages
- `frontend/src/features/content-studio/components/image-generator/ImageOutputViewer.tsx` (+ `.test.tsx`) — new `provider` prop; provider-specific pending hints
- `frontend/src/features/content-studio/pages/project-workspace/ProjectWorkspace.tsx` — hosts `useImageProviderPreference()`, passes it down to both image components

**Documentation:**
- `docs/HUGGINGFACE_PROVIDER.md` (new), `docs/HUGGINGFACE_SETUP.md` (new)
- `README.md`, `docs/ARCHITECTURE.md`, `PROJECT_STATE.md`, `CHANGELOG.md`

No schema changes, no migrations, no API contract changes, no new dependencies (Hugging Face integration reuses `axios`, already a dependency — no SDK, per the explicit "do not introduce third-party wrappers" instruction).

## Database Changes

None.

## API Changes

None to the request/response contract of `/api/v1/images/*`. `"huggingface"` and `"fake"` are simply names that now resolve (or already resolved) in the provider registry.

## Test Results

- Backend build: pass (`tsc`)
- Backend typecheck: pass (`tsc --noEmit`)
- Backend tests: **223/223 passing** (26 test files), up from 168 at the start of this sprint — 55 net new
- Frontend build: pass (`tsc -b && vite build`)
- Frontend typecheck: pass
- Frontend tests: **197/201 passing** (31/33 files) — the 4 failures are the exact, already-documented pre-existing baseline (2 in `search-provider.test.tsx`, 2 in `user-auth-form.test.tsx`), confirmed unrelated; 10 new tests, all passing
- Frontend lint: 26 pre-existing errors / 3 pre-existing warnings, unchanged — confirmed none are in any file this sprint touched
- Frontend format: this sprint's own new/modified files formatted individually with `prettier --write`; the pre-existing, `content-studio`-scoped Prettier drift flagged in Sprint 4.3 is unchanged and still deliberately not mass-reformatted
- Backend: no lint tooling configured (unchanged from prior sprints)

## Manual / Live Validation

Throwaway backend instance on a separate port, real production process (3001) confirmed untouched throughout:

- Booted with `IMAGE_PROVIDER=huggingface`, no `HUGGINGFACE_API_KEY` → immediate crash (`exit 1`) with the exact configured error, before any server binds.
- Booted with `IMAGE_PROVIDER=huggingface` and an intentionally-invalid key → server started successfully; `[HuggingFaceProvider] Health check failed: Hugging Face rejected the request: invalid or missing API key.` logged as a non-fatal warning — this was a **real** call to Hugging Face's live Hub API (`whoami-v2`), not mocked, confirming `describeHuggingFaceError()`'s 401 handling against Hugging Face's actual response shape. Free, no cost, no generation.
- Generated an image via `provider: "fake"` → `200`, `COMPLETED` (regression check — unaffected by this sprint's changes).
- Fetched that image via the existing `/uploads/images/...` static route → `200`, correct bytes (regression check for Sprint 4.3's fix).
- Generated an image via `provider: "huggingface"` with the same invalid key → `502`, sanitized `"Image generation failed. Please try again, or try a different provider."` to the client; server log showed `[ImageService] Provider "huggingface" failed for image ...`; `GET /images?projectId=...` (as the owner) showed the exact raw detail — `"Hugging Face rejected the request: invalid or missing API key — Invalid username or password."` — Hugging Face's own real error text, correctly captured end-to-end.
- Confirmed the registry still resolves `gemini`/`comfyui`/`huggingface` (each attempted and failed for unrelated, expected reasons in this unconfigured throwaway environment — not a regression) and still rejects an unregistered name (`"openai"` → `400`).
- All scratch artifacts cleaned up; production confirmed `200` immediately after.

## Provider Validation

| Provider | Status |
|---|---|
| Fake | Confirmed working live (regression check) |
| Gemini | Registered and resolvable (unchanged this sprint; not re-validated with a real key, per Sprint 4.2's own no-real-spend decision, still standing) |
| ComfyUI | Registered and resolvable (unchanged this sprint) |
| Hugging Face | New. Config validation, health check, and graceful sanitized failure all confirmed live against Hugging Face's real API; a real, successful generation has not been attempted (see Decisions) |

## Architecture Validation

- `ImageService`, routes, controllers, and validators are byte-for-byte unchanged by this sprint (confirmed via `git diff` before committing) — no provider-specific branching was introduced anywhere outside `huggingface.provider.ts` itself.
- `HuggingFaceProvider` implements the same `ImageProvider` interface, returns the same `GenerateImageResponse` shape, and is registered through the same `ImageProviderFactory.register()` call as every other provider — no special-casing in the registry.
- Confirmed no provider-specific response models were introduced — `mapHuggingFaceImageResponse()` returns the exact same `GenerateImageResponse` type `FakeImageProvider`/`GeminiImageProvider`/`ComfyUIProvider` all return.

## Decisions Made

- **`HuggingFaceProvider` never wraps its own errors** — same reasoning as `GeminiImageProvider`/`ComfyUIProvider`. Reconfirmed by re-reading `image.service.ts`'s existing `catch` block before writing this provider, same as every prior phase.
- **Health check uses the Hub API, not the inference API, specifically because a no-cost dry run of Hugging Face's inference endpoint doesn't exist.** `whoami-v2` and `/models/{id}` are Hugging Face's own documented Hub metadata endpoints (used internally by `huggingface_hub`'s `whoami()`/`model_info()`), entirely separate infrastructure from `hf-inference`'s generation endpoint — chosen deliberately so "verify auth and model access" and "generate an image" could be two genuinely different operations, satisfying the explicit "must not generate images" requirement without faking a dry-run mode that doesn't exist.
- **Raw axios/REST via `axios`, not `@huggingface/inference`.** Hugging Face's own docs push toward their official TypeScript SDK, and it's a legitimate, non-"unofficial" choice — but the brief explicitly said not to introduce third-party wrappers unless already used, and this codebase's established convention (`OllamaProvider`, `GeminiImageProvider`'s SDK exception aside, `ComfyUIClient`) is a thin axios wrapper unless a raw REST API is materially awkward without an SDK. Text-to-image's shape here (one JSON POST, raw bytes back) isn't, so axios was the right, minimal choice — no new dependency at all.
- **No assumption that any specific model is available**, reinforced in three places: `model.config.ts`'s default is explicitly documented as "a default, not a requirement"; `validateHuggingFaceProviderConfig()` only checks the model id's *shape*, never its existence; and the health check's model lookup is what actually confirms availability, live, non-fatally. A 403/404 from either the health check or a real generation attempt is treated as an expected, well-handled outcome, not an edge case bolted on afterward.
- **`randomSeed()` extracted to a shared util** the moment a second provider needed it — not before (a one-off `ComfyUIProvider`-only implementation was fine when there was only one caller; duplicating it a second time for `HuggingFaceProvider` would have been the actual violation of "avoid duplication").
- **Frontend loading/error polish is entirely client-side.** "Provider-specific loading states" and "provider-specific error messages" could have been read as requiring `ImageService` or the API contract to become provider-aware — explicitly avoided, since the brief also says no provider-specific branching in `ImageService`. Both are achieved using data the frontend already has (which provider it selected) layered on top of the existing safe, generic server message — no backend change needed for either.
- **No real Hugging Face generation was attempted**, with or without a valid key — no `HUGGINGFACE_API_KEY` has been provisioned anywhere for this project. Live validation deliberately stopped at the health check (a real, free, zero-cost Hub API call) and a graceful-failure generation attempt with a deliberately invalid key — consistent with this project's standing practice (Sprint 4.2 Phase 1, Sprint 4.3) of not spending real money or assuming credentials without being asked.

## Follow-ups for Future Sprints

- A small, explicit, approved real-provider smoke test for Gemini, ComfyUI, *and* Hugging Face (a real API key/real ComfyUI instance) before any is used for anything user-facing — still not done for any of the three.
- Deploy Sprint 4.1 through 4.4 to production — four sprints' worth of undeployed application code now.
- The production nginx `/uploads/` proxy addition (flagged in Sprint 4.3) is still open.
- The `ImageService` requested-vs-actual `format` reconciliation gap (first flagged in Sprint 4.2 Phase 1) is still open.
- Rate limiting / cost & resource control for image generation is still not implemented — now against three real providers instead of two.
- `content-studio/`'s pre-existing, repo-wide-but-feature-scoped Prettier formatting drift (discovered Sprint 4.3) is unresolved.
- No gallery/history/delete/regenerate UI for Image Studio yet — still a single-generation slice only.
- No per-request seed override for either `ComfyUIProvider` or `HuggingFaceProvider`; no `num_inference_steps`/`guidance_scale`/`scheduler` exposure for Hugging Face.

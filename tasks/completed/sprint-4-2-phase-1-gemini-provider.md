# Sprint 4.2 — Phase 1: Gemini Image Provider Integration

Status: Completed

## Goal

Integrate Google's Gemini image generation API as the first real, hosted `ImageProvider`, plugging into the registry Sprint 4.1 built and the hardened error/logging/config foundation Sprint 4.2 Phase 0 added — without redesigning `ImageService`, the provider abstractions, or introducing a second image pipeline.

## Scope

### In Scope

1. `GeminiImageProvider`, implementing the existing `ImageProvider` interface
2. `GEMINI_API_KEY` / `GEMINI_MODEL` configuration, via the existing `env.ts` pattern
3. Registration in the existing provider registry
4. Fail-fast startup validation when `IMAGE_PROVIDER=gemini`
5. Real image generation via Google's official `@google/genai` SDK
6. Reuse of `ImageService`'s existing stage-based error handling — no new error classes
7. Logging, following the existing style
8. Tests (mocked SDK — no real network calls)
9. Documentation

### Out of Scope (explicitly)

OpenAI, Stability AI, FLUX, provider-switching UI, queues, workers, rate limiting, billing, analytics, moderation/asset-review features, schema/migration changes, storage changes, background jobs. All deferred per `tasks/backlog/sprint-4-2-provider-integration.md`.

## What Shipped

**1. `GeminiImageProvider`** (`backend/src/providers/gemini/gemini-image.provider.ts`). Implements `ImageProvider` with a single `generate()` method, using `@google/genai`'s `ai.models.generateContent()` with `responseModalities: [Modality.IMAGE]`. Deliberately thin: it produces bytes and nothing else, and — critically — it does **not** catch and sanitize its own errors. Provider failures propagate raw, letting `ImageService`'s existing stage-based `catch` (built in Phase 0) log the detail, persist it to the owning user's `errorMessage`, and throw the safe, generic client-facing message. A `GeminiImageProvider` that pre-sanitized its own errors would have silently discarded exactly the raw detail Phase 0 was built to preserve — confirmed by re-reading `image.service.ts` before writing this class, not assumed.

**2. Configuration.** `env.ts` gained `geminiApiKey` (from `GEMINI_API_KEY`, no default) and `geminiModel` (from `GEMINI_MODEL`, default `gemini-2.5-flash-image` — the current production model, not the `-preview` variant). Neither uses `requireEnv()`, since both are only mandatory when Gemini is actually in use — same reasoning as `imageProvider` itself.

**3. Registration.** `register-image-providers.ts` now registers `gemini` alongside `fake`, unconditionally — matching the existing registry philosophy that registration means "this name resolves to a provider," not "this provider is fully configured." A `provider: "gemini"` per-request override works even when `IMAGE_PROVIDER` isn't set to `gemini`.

**4. Fail-fast configuration validation.** New `validateGeminiProviderConfig()`, co-located with the provider (mirroring Phase 0's `validateLocalDiskStorageConfig()` precedent) — throws a clear error if `GEMINI_API_KEY` is unset. Called from `app.ts`, but **only when `IMAGE_PROVIDER=gemini`** — an explicit per-request override without a configured default still works and correctly surfaces a missing key from the Gemini API call itself instead, not at boot. Verified live (see Validation below).

**5. Real image generation.** Sends the prompt directly (Gemini has no separate "negative prompt" field — see Limitations); maps the request's `width`/`height` to the nearest of Gemini's ten supported aspect ratios (`nearestSupportedAspectRatio()`, a pure, independently-tested function) via `imageConfig.aspectRatio`, since Gemini doesn't accept arbitrary pixel dimensions. Extracts the generated image from `response.data` (the SDK's own helper, documented as "the concatenation of all inline data parts from the first candidate").

**6. Error handling.** No new error classes — reuses `ImageGenerationError`/the stage-based handling from Phase 0 entirely, as required. `GeminiImageProvider` only throws when the SDK itself throws (network/auth/rate-limit failures, propagated with their original message) or when Gemini returns no image data at all — in which case a purpose-built internal message distinguishes a safety block (`promptFeedback.blockReason`), a non-`STOP` finish reason (e.g. `PROHIBITED_CONTENT`), or a generic empty response, so the owner's `errorMessage` (via `GET /images/:id`) says *why* generation produced nothing instead of a bare "no image data."

**7. Logging.** `GeminiImageProvider` logs at debug only (`"Requesting generation from model ..."`, `"Received image data from Gemini."`, and a note when `negativePrompt` is ignored) — deliberately not duplicating the info/error-level "generation started/succeeded/failed" lines `ImageService` already logs per image ID (Phase 0). Provider-level failure is *not* separately logged here, to avoid the exact double-logging-the-same-event Phase 0's cleanup eliminated; `ImageService`'s existing `[ImageService] Provider "gemini" failed for image X: ...` line is the single source of truth for that.

**8. Tests.** 17 new tests in `gemini-image.provider.test.ts`: successful generation (buffer/model/width/height/format), the exact SDK call shape (model, prompt, `responseModalities`, mapped aspect ratio), `negativePrompt` ignored + logged, raw API failure propagated unwrapped, invalid-API-key failure propagated unwrapped, three distinct "no image data" scenarios (safety block, non-`STOP` finish reason, generic), four `nearestSupportedAspectRatio()` cases, and both `validateGeminiProviderConfig()` branches. `register-image-providers.test.ts` updated to assert both `fake` and `gemini` are registered. `@google/genai` is fully mocked (`vi.mock`) — no real network calls anywhere in the suite.

**9. Dependency.** Added `@google/genai@^2.13.0` (Google's current, official unified Gen AI SDK) — the only new dependency, per the "minimize dependencies" instruction. Its (and `protobufjs`'s) install-time build script needed explicit approval under `pnpm-workspace.yaml`'s `allowBuilds` (pnpm now blocks postinstall scripts by default); inspected both packages' `scripts` before approving — standard, expected build steps for these two well-known packages, not unusual behavior.

## Files Changed

- `backend/src/providers/gemini/gemini-image.provider.ts` — new: `GeminiImageProvider`, `nearestSupportedAspectRatio()`, `validateGeminiProviderConfig()`
- `backend/src/providers/gemini/gemini-image.provider.test.ts` — new: 17 tests
- `backend/src/providers/register-image-providers.ts` — register `gemini`
- `backend/src/providers/register-image-providers.test.ts` — updated for two registered providers
- `backend/src/config/env.ts` — `geminiApiKey`, `geminiModel`
- `backend/src/app.ts` — conditional `validateGeminiProviderConfig()` call
- `backend/package.json` / `pnpm-lock.yaml` — `@google/genai` dependency
- `pnpm-workspace.yaml` — approved `@google/genai` and `protobufjs` build scripts
- `docs/ARCHITECTURE.md` — new "Image Provider Architecture" section
- `CHANGELOG.md`, `PROJECT_STATE.md` — documentation

No schema changes, no migrations, no API contract changes, no changes to `ImageService`, controllers, routes, or validators.

## Database Changes

None.

## API Changes

None. `provider: "gemini"` is now a valid value for the existing `provider` field on `POST /images/generate` (already validator-accepted as any safe-charset string; this is the first name that actually resolves).

## Validation

- Build: pass (`tsc`, backend)
- Typecheck: pass (`tsc --noEmit`)
- Tests: **125/125 passing** (18 test files), up from 108 at the start of this phase (17 net new)
- **Live validation** (throwaway instance, separate port, real production process on 3001 confirmed untouched throughout, no real Gemini API call made — see Limitations):
  - `IMAGE_PROVIDER=gemini` + no `GEMINI_API_KEY` → process crashes at boot (`exit 1`), with the exact configured error message, before any server binds.
  - `IMAGE_PROVIDER=gemini` + a `GEMINI_API_KEY` present (any non-empty value — this check only confirms presence, not validity) → boots cleanly, `✅ Server Ready`.
  - No throwaway `.env`/log artifacts left in the scratchpad afterward; confirmed `GET /api/v1/health` on production (port 3001) still returns `200` after this validation.

## Decisions Made

- **`GeminiImageProvider` never wraps its own errors.** The one design decision this phase turned on. Wrapping locally would have looked reasonable in isolation but would have quietly undone Phase 0's raw-detail-preservation work — caught by re-reading `image.service.ts`'s existing `catch` block before writing the provider, not by trial and error.
- **Width/height → aspect ratio, not decoded pixel dimensions.** `GenerateImageResponse.width`/`height` echo the *requested* values, not measured output dimensions — Gemini doesn't report exact pixel size, and decoding the returned PNG to measure it would be a new dependency for a field `ImageService` doesn't currently persist back to the database anyway (see Limitations).
- **`negativePrompt` is ignored, not translated into prompt text.** Gemini has no native negative-prompt parameter. Appending "avoid X" to the prompt would be inventing behavior the interface doesn't promise, per this phase's explicit instruction to document limitations rather than invent behavior around them.
- **Output format is always reported as `"png"`**, regardless of what was requested — Gemini only ever returns PNG. This is honest about what the provider actually produced, at the cost of exposing a pre-existing gap: `ImageService.generate()` persists the *requested* format to the database up front and never reconciles it against `result.format`. `FakeImageProvider` always echoed the request back, so this gap was invisible until now. Not fixed here — fixing it means touching `ImageService`, which this phase was explicitly told not to redesign. Flagged below as a real follow-up, not a bug introduced by this phase.
- **No real Gemini API call was made**, live or in tests, despite a `GEMINI_API_KEY` already being present in the production `.env` (apparently pre-provisioned ahead of this phase). This platform's own Sprint 4.2 roadmap (`tasks/backlog/sprint-4-2-provider-integration.md`) explicitly calls the first real-money provider call "an explicit go/no-go moment" — treated that as still applying to the very first call, not just the first *production-default* call, and asked rather than assumed. Everything above was verified either through mocked unit tests or a boot-only live check that never reaches Gemini's network endpoint.

## Follow-ups for Future Sprints

- **Format mismatch, exposed but not caused by this phase**: `ImageService` persists the requested `format` before generation and never reconciles it against what a provider actually returned. Harmless with `FakeImageProvider` (always matches); with `GeminiImageProvider`, requesting `jpg`/`webp` will store a DB row saying `JPG`/`WEBP` while the actual file on disk is a `.png`. Worth a small, explicit fix in a future phase — likely persisting `result.format` at the final `COMPLETED` update, the same place `result.model` is already persisted.
- **A real, controlled Gemini API call** has not yet been made against this integration — recommend a small, explicit go/no-go smoke test (a handful of real calls) before this becomes the configured default or reaches any user-facing surface, consistent with the roadmap's own guidance for the first real provider.
- Everything already flagged in Phase 0's sprint log remains open and unaffected by this phase: undeployed application code (now three sprints' worth), no rate limiting / cost control ahead of real provider traffic, no retention/cleanup policy for orphaned files, no frontend surface for Image Studio yet.

## Pointers

- Prerequisite phase: `tasks/completed/sprint-4-2-phase-0-production-readiness.md`
- Prerequisite sprint: `tasks/completed/sprint-4-1-ai-image-studio-backend.md`
- Broader roadmap this phase draws its provider order and readiness review from: `tasks/backlog/sprint-4-2-provider-integration.md`
- Gemini's own docs: https://ai.google.dev/gemini-api/docs/image-generation

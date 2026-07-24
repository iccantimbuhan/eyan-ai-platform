# Sprint 4.2 — Phase 0: Production Readiness (Portfolio-Focused)

Status: Completed

## Goal

Harden the AI Image Studio backend built in Sprint 4.1 — configuration validation, request validation, error handling, logging, and code cleanup — before any real, billable AI provider is integrated in a later Sprint 4.2 phase. Explicitly scoped as polish, not redesign: no new provider, no queues, no billing, no rate limiting, no architectural change to `ImageService` or the provider abstractions.

Framed around this project's actual purpose: a portfolio for an AI Content Production / Content Moderation role. The improvements here — safe error messages, structured logging, fail-fast configuration — are the specific, demonstrable "production-ready engineering" and "clean architecture" signals that role calls for, not enterprise scaffolding for its own sake.

## Scope

### In Scope

1. Configuration validation (fail-fast at startup)
2. Request validation review
3. Error handling — differentiate failure categories, stop leaking internal detail
4. Logging — cover the full generation/deletion lifecycle, without excess or sensitive content
5. Code cleanup — reduce duplication, confirm no dead code
6. Testing — expand coverage for all of the above

### Out of Scope (explicitly)

OpenAI/Gemini/Stability/FLUX integration, queues, background workers, billing, analytics, rate limiting, user quotas, any redesign of `ImageService` or the provider abstractions. All deferred to later Sprint 4.2 phases per `tasks/backlog/sprint-4-2-provider-integration.md`.

## What Shipped

**1. Configuration validation.** Added `validateLocalDiskStorageConfig()` — confirms the configured storage root can be created and is writable at boot, mirroring the existing `validateImageProviderConfig()`/`env.ts` fail-fast pattern. Previously, a misconfigured or unwritable `STORAGE_LOCAL_ROOT` would only surface on the first real generation request; now it crashes the process at startup with a clear message. Verified live: booting with a deliberately unwritable path fails immediately (`EACCES`, process exits before accepting any request).

**2. Request validation.** `negativePrompt` now trimmed (previously the only free-text field in the validator that wasn't, inconsistent with `prompt`). `provider` is now trimmed, length-capped (100 chars), and restricted to a safe charset (letters/digits/hyphens/underscores) — previously an unrestricted string, allowing arbitrary garbage into logs and error messages. No existing validation rule was loosened; no API contract changed (same fields, same optionality). Verified live: a malformed provider name is now rejected by the validator (`400`) before reaching the service, and a padded `negativePrompt` comes back trimmed.

**3. Error handling.** `ImageService.generate()` previously used one try/catch spanning both the provider call and the storage call, producing one generic, undifferentiated error either way — and forwarded the raw underlying error message straight to the client, regardless of what it contained. Now:

   - Each stage — creating the initial record, calling the provider, calling storage, persisting the final status — has its own try/catch and its own log line, so a failure is attributable to a specific stage from the logs alone.
   - `repository.create()` (the initial `PENDING` row) failing was previously **entirely unhandled** — no log, no context, just an opaque propagated error. Now logged and rethrown as itself.
   - Provider failures and storage failures now throw **distinct, safe, client-facing messages** ("Image generation failed..." vs. "The image was generated but could not be saved...") instead of one generic wrapper.
   - The raw underlying error (which could include vendor/internal detail — hostnames, stack fragments, library-specific text) is **no longer forwarded to the HTTP response**. It's still persisted to the `errorMessage` column, visible to the image's owner via `GET /images/:id` (a legitimate, ownership-scoped "why did my generation fail" UX), but the immediately-thrown API error is always a fixed, safe message.
   - "Invalid request" (validator, `400`) and "configuration error" (`ImageProviderNotConfiguredError`/`UnsupportedImageProviderError`, `400`) were already correctly differentiated in Sprint 4.1 and are unchanged.
   - "Database failure" cases (initial create, final `COMPLETED` update) still propagate as raw, unwrapped errors — deliberately unchanged from Sprint 4.1 Phase 5's design — but are now logged before propagating, and confirmed via the existing global error handler to still fall through to a generic `500` at the HTTP layer (no leak there either, verified by reading `error-handler.ts`, not just assumed).

**4. Logging.** Every lifecycle event the sprint asked for now has a corresponding log line: generation start, provider success, generation failure (provider-specific), storage failure (distinct from provider failure), overall completion, deletion, and provider resolution (which source — explicit request override vs. configured default — resolved the provider, at debug level). Storage success was deliberately left logged only at the `StorageProvider` layer (already present since Sprint 4.1 Phase 2) rather than duplicated at the service layer, to avoid double-logging the same event. `FakeImageProvider`'s debug log now truncates prompt text to 80 characters — a defensive measure relevant to this project's content-moderation framing, even though debug logging is already gated off in production by `lib/logger.ts`.

**5. Code cleanup.** Extracted `errorMessageOf()` (replacing four repeated `error instanceof Error ? error.message : "Unknown error"` blocks) and `markFailed()` (the previously-single-use-but-now-duplicated "attempt to record FAILED status, log if that itself fails" logic, now shared by both the provider-failure and storage-failure paths). Scanned the full Image Studio module for dead code, leftover `console.*` calls, and `TODO`/`FIXME` markers — none found.

**6. Testing.** 18 new tests: differentiated error messages (provider vs. storage vs. raw DB error), the previously-untested initial-`create()`-failure path, logging assertions (via `vi.spyOn(logger, ...)`) for generation start/success/completion/deletion/provider-resolution, and three new tests for `validateLocalDiskStorageConfig()` (success, unwritable-root, uncreatable-root).

## Files Changed

- `backend/src/services/image.service.ts` — differentiated error handling, full lifecycle logging, `markFailed`/`errorMessageOf` extraction
- `backend/src/services/image.service.test.ts` — updated + 8 new tests
- `backend/src/validators/image.validator.ts` — trim `negativePrompt`, tighten `provider`
- `backend/src/providers/local-disk/local-disk-storage.provider.ts` — new `validateLocalDiskStorageConfig()`
- `backend/src/providers/local-disk/local-disk-storage.provider.test.ts` — 3 new tests
- `backend/src/providers/fake/fake-image.provider.ts` — truncate prompt in debug log
- `backend/src/app.ts` — wire `validateLocalDiskStorageConfig()` into startup

No schema changes, no migrations, no new dependencies, no API contract changes.

## Database Changes

None.

## API Changes

None to the request/response contract. `provider` field validation is stricter (rejects previously-accepted-but-nonsensical values like `"not a valid name!!"`); this only rejects inputs that could never have resolved to a real registered provider anyway.

## Validation

- Build: pass (`tsc`, backend)
- Typecheck: pass (`tsc --noEmit`)
- Lint: n/a — backend has no lint tooling configured (unchanged from prior sprints)
- Tests: **108/108 passing** (17 test files), up from 98 at the start of this phase (10 net new)
- **Live validation** against a throwaway instance (separate port, real production service on 3001 confirmed untouched throughout):
  - Unwritable `STORAGE_LOCAL_ROOT` → process crashes at boot with a clear, specific error (confirmed via real exit code and stderr).
  - Valid boot → real generation request → log output inspected directly, confirmed exact expected sequence: provider resolution → generation started → provider success → storage success (from `LocalDiskStorageProvider`) → completed.
  - Malformed `provider` field → real `400` from the validator, confirmed request never reached the service.
  - Padded `negativePrompt` → confirmed trimmed in the actual persisted/returned row.
  - Delete → confirmed both `[LocalDiskStorageProvider] Deleted ...` and `[ImageService] Deleted image ...` log lines fire, in order.

## Decisions Made

- Kept `ImageGenerationError` as a single class (not split into per-stage subclasses) — differentiation is via distinct, fixed client messages and distinct structured log lines, not new error types. Matches the explicit constraint to avoid unnecessary architecture.
- Database-layer failures continue to propagate raw/unwrapped (Sprint 4.1 Phase 5's precedent), now with logging added — verified this is still safe against leaking internals, since the global `errorHandler` already reduces any non-`ApiError` to a generic `Internal Server Error` (500).
- `errorMessage` (the DB column) intentionally keeps the full raw failure detail, since it's only ever exposed to the image's own owner via an ownership-scoped route — different risk profile from the immediately-thrown HTTP error, which is sanitized.

## Follow-ups for Future Sprints

- Rate limiting / cost control remains explicitly deferred (per this phase's own constraints) but is still the top prerequisite before any real, billable provider goes live — see `tasks/backlog/sprint-4-2-provider-integration.md`.
- Sprint 4.1's application code (and now this phase's) remains undeployed while migrations are live — still recommend deploying before the first real provider phase begins.

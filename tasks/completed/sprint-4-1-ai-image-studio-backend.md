# Sprint 4.1 — AI Image Studio (Backend Pipeline)

Status: Completed

## Goal

Extend Content Studio with AI image generation, following the architecture proposed and approved before implementation began: reuse the existing layered backend pattern, keep image generation behind a provider abstraction independent of the existing text `AIProvider`, keep storage behind its own provider abstraction, and fully validate the internal pipeline with a deterministic fake provider before spending anything on a real, billable AI service.

Preceded by **Sprint 3.5 — Security Hardening** (`sprint-3-5-security-hardening.md`), a deliberate prerequisite: `ContentProject`/`GeneratedContent` ownership was closed first so Image Studio wouldn't inherit that gap on a new resource.

## Scope

### In Scope

- `GeneratedImage` backend module (routes/controller/service/repository/validator/dto), mirroring `content`/`projects`.
- `StorageProvider` abstraction + `LocalDiskStorageProvider`.
- `ImageProvider` abstraction + provider registry (`ImageProviderFactory`).
- A deterministic `FakeImageProvider` (no network calls) to validate the pipeline end-to-end.
- Full generation orchestration: `PENDING` → `COMPLETED`/`FAILED` lifecycle, storage cleanup on delete, provider selection strategy, startup config validation.

### Out of Scope (explicitly, deferred to Sprint 4.2+)

- Any real external provider (OpenAI Images, Gemini, Stability AI, FLUX).
- Frontend: tabs, generation form, gallery, preview, download/regenerate/save-to-project UI.
- Cloud storage (S3/R2/Azure/GCS) — the `StorageProvider` seam exists specifically so this can be added later without touching business logic.
- Rate limiting / cost controls (deferred until a real, billable provider exists — flagged for Sprint 4.2).
- Async/background generation (still synchronous, per ADR-0005's precedent; schema is forward-compatible).

## What Shipped, By Phase

Each phase was implemented, tested, and reviewed independently; none were combined.

**Phase 1 — Backend module skeleton.** `GeneratedImage` Prisma model (nullable `storagePath`/`thumbnailPath`, `status` defaulting to `PENDING` for forward async-compatibility). Ownership derived transitively through `ContentProject.userId` — no duplicate `userId` column on `GeneratedImage`, extending ADR-0007's pattern. `list`/`getById`/`delete` wired at every layer; deliberately no `create()`/`generate()` anywhere yet, since every method in this codebase's existing modules is route-reachable and creation only makes sense once a provider and storage exist to call.

**Phase 2 — `StorageProvider` abstraction.** `save`/`delete`/`getUrl` interface; `LocalDiskStorageProvider` with `<root>/<projectId>/<uuid>.<ext>` layout, directory auto-creation, extension allowlist, and path-traversal guards on both `projectId` and resolved paths. Config centralized in `env.ts` (`STORAGE_LOCAL_ROOT`, `STORAGE_PUBLIC_BASE_URL`). Standalone and tested; not yet wired to anything.

**Phase 3 — `ImageProvider` abstraction.** `generate()` request/response DTOs colocated with the interface (matching `ai-provider.ts`'s existing convention). Unlike `AIProvider` (deliberately single-provider per ADR-0001 — no local GPU), `ImageProviderFactory` is a real registry (`register`/`create`/`listRegistered`/`reset`), since multiple hosted image providers are genuinely expected. `UnsupportedImageProviderError`/`ImageGenerationError` added. No concrete provider yet.

**Phase 4 — Full internal pipeline.** `ImageService.generate()`: verify project ownership → resolve provider → persist a `PENDING` row → call `ImageProvider.generate()` → call `StorageProvider.save()` → update to `COMPLETED` (or `FAILED` with `errorMessage` on any failure). A deterministic `FakeImageProvider` (real production code, not test-only) registered under `"fake"` via a new `registerImageProviders()` bootstrap in `app.ts` — the first real exercise of the Phase 3 registry. `POST /api/v1/images/generate` wired end-to-end.

**Phase 5 — Lifecycle completion.** Storage cleanup on delete (best-effort, non-blocking — a user can always remove an image from their history even if disk cleanup fails). Provider selection formalized (`resolveProviderName()`: request override → configured default → `ImageProviderNotConfiguredError`). Startup validation (`validateImageProviderConfig()`, fails fast at boot if `IMAGE_PROVIDER` is set to an unregistered name, mirrors `env.ts`'s `requireEnv()` philosophy). Fixed a real lifecycle bug: a failure in the final `COMPLETED` update (after generation/storage already succeeded) was previously re-marking the row `FAILED`, misreporting a successful generation whose file already existed on disk — the `COMPLETED` update now sits outside the provider/storage try/catch so a DB-layer failure there propagates as itself.

## Architecture Decisions

- **Ownership**: `GeneratedImage` has no `userId` column; ownership is derived through `project.userId` via a Prisma relation filter, extending ADR-0007 rather than duplicating it. This is the intended shape for future media types (video, audio) on the roadmap — one ownership source of truth per project, not one per media table.
- **Provider separation**: `ImageProvider` is a new, independent interface — not a method added to `AIProvider` — because text and image generation have genuinely different request/response shapes and, more importantly, different provider-count realities (`AIProvider` is single-provider by hardware necessity per ADR-0001; `ImageProviderFactory` is a registry because multiple hosted image providers are expected).
- **Strict separation of concerns**, enforced throughout: `ImageProvider` only ever produces bytes; `StorageProvider` only ever persists bytes it's handed; `ImageRepository` only ever receives plain data, never a `Buffer` or a provider instance; `ImageService` is the only class that knows about all three.
- **Validate before integrating**: every phase through Phase 5 used a deterministic, in-process `FakeImageProvider` instead of any real API — the full pipeline (ownership, orchestration, status transitions, storage, cleanup, error handling) was proven correct before Sprint 4.2 spends anything on a real, billable service.

## Files Created / Modified

28 files, ~1,815 lines added across Phases 1–5 (backend only — no frontend changes this sprint). Full diff: `git diff 140765d..8c34924`. Key additions: `backend/prisma/schema.prisma` (`GeneratedImage` model + 2 migrations), `backend/src/services/image.service.ts`, `backend/src/providers/{interfaces/image-provider.ts, interfaces/storage-provider.ts, image-provider.factory.ts, storage-provider.factory.ts, local-disk/, fake/, register-image-providers.ts}`, `backend/src/repositories/image.repository.ts`, `backend/src/controllers/image.controller.ts`, `backend/src/routes/v1/image.routes.ts`, `backend/src/validators/image.validator.ts`, `backend/src/dto/image.dto.ts`, `backend/src/errors/image-provider.error.ts`.

## Database Changes

- `GeneratedImage` model added (Phase 1), `model` column relaxed to nullable (Phase 4 — unknown until a generation succeeds). Both migrations applied directly to the shared dev/production database (single-VPS environment); both were purely additive to an empty table, carrying none of Sprint 3.5's backfill risk.
- `ContentProject.generatedImages` / reverse relation added.

## API Changes

New routes under `/api/v1/images`, same `authenticate → validate → controller → service → repository` chain as every other module:

- `POST /images/generate` — `{ projectId, prompt, negativePrompt?, width?, height?, format?, provider? }` → `201` with the completed `GeneratedImage` row, or `502 ImageGenerationError` / `400 ImageProviderNotConfiguredError` / `400 UnsupportedImageProviderError` on failure.
- `GET /images?projectId=` — paginated, ownership-scoped.
- `GET /images/:id`, `DELETE /images/:id` — ownership-scoped, `404` (not `403`) for a nonexistent-or-not-yours row.

## Validation

- Build: pass (`tsc`, backend)
- Typecheck: pass (`tsc --noEmit`)
- Lint: n/a — backend has no lint tooling configured (unchanged from prior sprints)
- Tests: **98/98 passing** (17 test files), up from 52 at the start of this sprint — 46 new tests across repositories, services, and providers
- **Live validation, every phase, against a throwaway instance** (separate port, real production service on 3001 never touched): Phase 4 — real `FakeImageProvider` + real `LocalDiskStorageProvider` + real DB, full generate → list → get → delete cycle, file confirmed on disk. Phase 5 — boot with unset `IMAGE_PROVIDER` (warns, boots fine), boot with an invalid `IMAGE_PROVIDER` (crashes immediately with a clear message, confirmed via real process exit code), boot with a valid one (generation works without a per-request override), and confirmed the stored file is actually removed from disk on delete.

## Current Production Status

Migrations are live in the shared database (both phases' schema changes are additive and backward-compatible with the previously-running code, unlike Sprint 3.5's). **Application code has not been deployed** — no `deploy.sh` run, no `systemctl restart`, per this sprint's explicit scope ("no production deployment required" at every phase). The running production process is still the pre-Sprint-4.1 binary; the new `/api/v1/images/*` routes do not exist in the live, publicly-served API yet. This is a deliberate, known state, not an oversight — deployment was never requested this sprint.

## Remaining Technical Debt / Follow-ups

- No real image provider is registered or configured for actual use — `IMAGE_PROVIDER` is unset in the real `.env`; `"fake"` is the only registered provider. This is the explicit subject of Sprint 4.2.
- No rate limiting or per-user/per-project generation caps exist yet. Harmless today (no external cost), but becomes a real requirement the moment a billed provider is registered — flagged for Sprint 4.2 planning.
- No frontend surface exists for any of this yet (by design — Sprint 4.1 was backend-only, per the approved architecture).
- Local disk storage has no retention/cleanup policy for orphaned files (e.g. a process crash between a successful `storageProvider.save()` and the following DB write — a narrow window, not yet hardened against). Not fixed this sprint; worth a decision before real, larger-volume usage.
- This sprint's application code sitting undeployed alongside already-applied migrations should be resolved (deployed) before Sprint 4.2 work assumes a clean, fully-live baseline — recommend deploying Sprint 4.1 before or alongside the start of Sprint 4.2's first real provider phase.

## Pointers

- Prerequisite: `sprint-3-5-security-hardening.md`, `ADR-0007-content-project-ownership.md`
- Next: `tasks/backlog/sprint-4-2-provider-integration.md`

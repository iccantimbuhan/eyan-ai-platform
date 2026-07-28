# Sprint 7.2.1 — AI Video Editing Pipeline: Source Ingestion

Status: Completed

## Goal

Let users upload a real video file into the existing AI Video Studio, so it becomes a normal, first-class `VideoAsset` — reviewable, searchable, and analytics-tracked exactly like every other asset type — with zero redesign of Asset Library, Review, Publishing, or Analytics. This is Milestone 1 of the Sprint 7.2 AI Video Editing Pipeline (per the approved architecture proposal); no planner, execution engine, FFmpeg editing, Whisper, or background job infrastructure is in scope here.

## Scope

### In Scope

- Two new `VideoAssetKind` values (`UPLOADED_SOURCE` this sprint; `EDITED_VIDEO` reserved for a later milestone) and three additive nullable `VideoAsset` columns (`durationMs`, `videoFormat`, `sourceFileName`).
- Disk-streamed multipart upload (`multer`, disk storage — never memory storage) → `ffprobe`-derived metadata → persisted via the existing `StorageProvider`.
- `VideoSourceService`, a new `POST /api/v1/video-edit/sources` endpoint, and a matching frontend upload panel inside the existing Video tab.
- The uploaded file's first real `<video>` playback anywhere in this codebase.

### Out of Scope (explicitly deferred to later milestones)

- Natural-language Workflow Planner, Execution Engine, FFmpeg editing operations, Whisper transcription, OpenCV/MediaPipe analysis, background job infrastructure, progress tracking UI. None of these were implemented or stubbed.

## What Shipped

- **Database**: `VideoAssetKind.UPLOADED_SOURCE` (additive enum growth, the same safe move already made twice for this enum); `VideoAsset.durationMs`/`videoFormat`/`sourceFileName` (nullable, additive — same posture as `generationTimeMs`/`brandKitId` before them). Migration `20260727212643_add_video_upload_source`, applied and verified against the real development database (`prisma migrate status` confirms zero drift). Zero changes to any of the 32 pre-existing models.
- **Storage layer, extended not redesigned**: `SaveFileInput` gained an optional `sourcePath` alongside the existing `buffer` — `LocalDiskStorageProvider.save()` now either writes a buffer (unchanged, every existing caller) or moves an already-on-disk file into the storage root via `rename()` (with an `EXDEV` copy+unlink fallback), never reading the file into Node memory. This exists specifically because the backend runs under PM2 with a 500MB `max_memory_restart` ceiling (`ecosystem.config.cjs`) — a point the Sprint 7.2 architecture review surfaced from the real repo config, not a hypothetical. `ALLOWED_EXTENSIONS` gained `mp4`/`mov`/`webm`.
- **Upload middleware**: `video-upload.middleware.ts` — `multer.diskStorage` writing straight to `env.videoUploadTempDir` (same filesystem as `storageLocalRoot` by default, so the move above is a same-mount rename), a cheap mimetype-allowlist `fileFilter` (first-pass rejection only — see below for the real check), a configurable size cap (`VIDEO_UPLOAD_MAX_BYTES`, default 500MB), and mapping of `MulterError`/rejection into this module's own `ApiError` subclasses so failures surface as clean 400s, not generic 500s.
- **`ffprobe.util.ts`**: spawns `ffprobe` (`child_process.spawn`, argv array, never a shell string) against the uploaded file and parses duration/resolution/codec/container/audio-presence from its JSON output. This is also the *authoritative* validation — a file that merely has a video-sounding extension/mimetype but isn't a real video fails here, with a clean, sanitized error, before ever becoming a `VideoAsset` row.
- **`VideoSourceService.ingest()`**: verifies project ownership, validates the extension, probes the file, persists it, creates the `VideoAsset(kind=UPLOADED_SOURCE, status=COMPLETED, prompt=<original filename>)` row, and fires a best-effort `AnalyticsEvent` — the identical fire-and-forget pattern `ContentService`/`ImageService`/`VideoAssetService.generate()` already use. Every failure path (bad project, bad extension, ffprobe rejection, storage failure) deletes the temp upload file before throwing, so nothing orphans on disk. This is a synchronous request/response operation, not a background job — `ffprobe` is fast enough that there's no PENDING-then-update lifecycle to build yet.
- **API**: `POST /api/v1/video-edit/sources` (multipart, `authenticate`-only, matching every other Content Studio route — no new RBAC permission). The pre-existing `POST /video-assets/generate` validator was updated to explicitly reject `kind: "UPLOADED_SOURCE"` (it only knows how to dispatch to `ChatService`/`ImageProviderFactory`, neither of which apply here) — a fix made necessary by extending the shared `VideoAssetKind` enum, caught before it could ship as a silent regression. Listing/filtering (`GET /video-assets?kind=`) still accepts every kind, including the new one.
- **Frontend**: `VideoSourceUpload` — a new panel inside the existing Video tab (`ProjectWorkspace.tsx`), sibling to `VideoGenerateForm`, not a new tab or module. Upload progress bar (axios `onUploadProgress`), server-sanitized error display, and on success a real `<video controls>` player with the file's actual duration/resolution/container. `VideoAssetList`'s existing card renderer gained a third branch (`isVideoFileKind`) so an uploaded source renders as a video player rather than falling into the image branch or the "did not complete" error branch. One necessary fix to the shared `api.ts` axios client: its request interceptor unconditionally forced `Content-Type: application/json` on every request, which would have silently corrupted the multipart upload — it now only does so when the request body isn't a `FormData` instance (the first upload anywhere in this frontend).

## Files Created / Modified

Backend — created: `src/utils/ffprobe.util.ts` (+test), `src/services/video-source.service.ts` (+test), `src/controllers/video-source.controller.ts` (+test), `src/middleware/video-upload.middleware.ts`, `src/errors/video-source.error.ts`, `src/validators/video-source.validator.ts`, `src/routes/v1/video-sources.routes.ts`, migration `20260727212643_add_video_upload_source`.
Backend — modified: `prisma/schema.prisma`, `src/app.ts`, `src/config/env.ts`, `src/providers/interfaces/storage-provider.ts`, `src/providers/local-disk/local-disk-storage.provider.ts` (+test), `src/repositories/video-asset.repository.ts` (+test), `src/dto/video-asset.dto.ts`, `src/dto/video-asset.mapper.ts`, `src/dto/asset.mapper.ts`, `src/validators/video-asset.validator.ts`.
Frontend — created: `features/content-studio/api/video-sources.api.ts`, `features/content-studio/hooks/use-upload-video-source.ts`, `features/content-studio/components/video-studio/VideoSourceUpload.tsx` (+test).
Frontend — modified: `services/api.ts`, `features/content-studio/types/video-asset.ts`, `features/content-studio/api/images.api.ts`, `features/content-studio/components/video-studio/VideoAssetList.tsx` (+test), `features/content-studio/pages/project-workspace/ProjectWorkspace.tsx`.

## Database Changes

See "What Shipped" above — additive only, migration applied and verified with zero drift.

## API Changes

- `POST /api/v1/video-edit/sources` (new) — multipart upload → `VideoAsset`.
- `POST /api/v1/video-assets/generate` — now rejects `kind: "UPLOADED_SOURCE"` (previously would have silently accepted it and misrouted to image generation once the enum grew).

## Validation

- Build: clean (backend `tsc`, frontend `vite build`).
- Typecheck: clean on both sides.
- Lint: 0 new errors/warnings on any changed or new file; repo-wide baseline unchanged (27 errors / 3 warnings before and after — the 4 pre-existing `api.ts` console-statement errors are untouched by this sprint).
- Tests: backend 585/585 passing (23 new: ffprobe util, `VideoSourceService`, `VideoSourceController`, `LocalDiskStorageProvider` sourcePath/EXDEV paths + boot validation, `VideoAssetRepository`); frontend full suite 353 tests, 349 passing / 4 failing — the 4 failures are the same pre-existing, already-documented baseline (`search-provider.test.tsx` ×2, `user-auth-form.test.tsx` ×2), none in a file this sprint touched; 6 new tests (VideoAssetList, VideoSourceUpload) all passing.
- **Live-validated** against the real EYAN Studio development database and a throwaway backend/frontend instance on spare ports (production/dev instances untouched throughout): real `ffmpeg`-generated 3-second test-pattern video uploaded via direct API call and via a full real-browser session (registration → sign-in → project creation → Video tab → file upload). Confirmed: correct `ffprobe` metadata (640×360, 3.0s, mov/mp4 container) persisted and displayed; the file physically moved (not copied — temp dir empty afterward, byte count matches exactly) into `storage/images/<projectId>/`; served correctly over the existing static route; the uploaded asset appears automatically in the Asset Library (`AssetType.VIDEO`, "Uploaded Source — test-video.mp4", `DRAFT` status) and the Review queue (correctly empty under "Needs Review" since it hasn't been reviewed yet); a non-video file upload was correctly rejected by `ffprobe` validation with a clean 400; a wrong-mimetype upload was correctly rejected by the multer filter; `POST /video-assets/generate` with `kind: "UPLOADED_SOURCE"` was correctly rejected by the updated validator.

## Decisions Made

No new ADR — this milestone implements, without deviation, the architecture already reviewed and approved in the Sprint 7.2 architecture proposal (extend `VideoAsset`/`VideoAssetKind` rather than a new model; stream-to-disk uploads given the real PM2 500MB ceiling; reuse the `StorageProvider` interface with a minimal additive extension rather than a parallel upload-storage path). One small addition beyond the original brief, both surfaced during implementation and fixed before shipping: (1) the `video-assets/generate` validator needed an explicit `UPLOADED_SOURCE` exclusion, since extending the shared enum silently widened that endpoint's accepted input; (2) the shared frontend `api.ts` client needed a `FormData`-aware `Content-Type` guard, since this is the first file upload anywhere in this frontend and the client unconditionally forced JSON on every request.

## Follow-ups for Future Sprints

- Sprint 7.2.2 onward (per the approved architecture): Workflow Planner (NL → validated JSON plan), Execution Engine + `VideoEditJob`, FFmpeg core operations, Whisper transcription, computer-vision operations (sequenced last, explicitly flagged as the highest-risk/slowest given this hardware).
- Asset Library's grid thumbnail (`thumbnailUrl`) still just points at `storagePath` for every kind, including a raw video file — an uploaded source's card in the Asset Library grid shows a broken-image icon rather than a real thumbnail. Not fixed here (would mean touching Asset Library's mapper/frontend rendering, out of scope for source ingestion); the Video tab's own list already renders a real `<video>` player correctly.
- No disk-space quota/retention policy for uploaded video files (the same open risk this repo already carries for orphaned image files, now larger in practice since video files are bigger).
- `VIDEO_UPLOAD_MAX_BYTES`/`VIDEO_UPLOAD_TEMP_DIR` are configurable but untested at the real 500MB ceiling with a real large file — only a small (45KB) test file has been exercised live.

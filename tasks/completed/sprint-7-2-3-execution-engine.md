# Sprint 7.2.3 — AI Video Editing Pipeline: Execution Engine + Core FFmpeg Operations

Status: Completed

## Goal

Actually execute an approved `VideoWorkflowPlan` (Sprint 7.2.2): load it, re-validate it, run its steps sequentially through real FFmpeg, and produce a new, real edited video file — persisted as an ordinary `VideoAsset`. No AI decisions happen during execution; the stored plan runs exactly as written. This is Milestone 3 of the Sprint 7.2 AI Video Editing Pipeline. No Whisper, OpenCV, background workers, queues, or progress polling — those remain later milestones, explicitly out of scope here.

## Scope

### In Scope

- `FFmpegVideoProvider`: hides every FFmpeg implementation detail behind `run(step, inputPath, outputPath)`, executing exactly five operations — `trim`, `remove_silence`, `normalize_audio`, `resize`, `brightness`.
- `VideoExecutionEngineService`: loads the plan, re-validates it, rejects any not-yet-executable operation wholesale, runs steps sequentially (each step's output feeds the next step's input), saves the final result via the existing `StorageProvider`, and persists it as `VideoAssetKind.EDITED_VIDEO`.
- `POST /api/v1/video-edit/execute` and a minimal "Execute a Workflow" panel in the existing Video tab.
- A minimal `GET /api/v1/video-edit/planner?projectId=` listing endpoint — a small necessary addition, since the frontend now needs a way to "select an existing workflow" and no such endpoint existed at the end of Sprint 7.2.2.

### Out of Scope (explicitly deferred to later milestones)

- `subtitles`, `blur_faces`, `auto_zoom`, `background_music`, `shorts` execution (planning for them already exists from Sprint 7.2.2 — a plan containing any of these is rejected wholesale at execution time, never partially run). Faster Whisper, OpenCV, MediaPipe, background workers, Redis/BullMQ, queue processing, progress polling, WebSockets, and any planner changes. None of these were implemented or stubbed.

## What Shipped

- **Database**: `VideoAssetKind.EDITED_VIDEO` (additive enum growth — the fourth safe move for this enum). `VideoWorkflowPlan` gained `resultVideoAssetId String? @unique` (FK to `VideoAsset`, `SetNull`) and `executedAt DateTime?` — the minimum execution metadata actually needed ("did this plan run, and what did it produce"), deliberately not a `VideoEditJob`/queue model, since execution is synchronous this milestone. Migration `20260728010000_add_video_execution_engine`, hand-authored via `prisma migrate diff --script` (the same fallback Sprint 6.1 used) since this environment's non-interactive shell blocks `prisma migrate dev`'s enum-addition confirmation prompt; applied via `prisma migrate deploy` and verified against the real development database with zero drift.
- **`FFmpegVideoProvider`** (`providers/ffmpeg/ffmpeg-video.provider.ts`): one entry point, `run(step, inputPath, outputPath)`, dispatching to five private methods, each building an argv array for `spawn("ffmpeg", args)` — never a shell string, matching `ffprobe.util.ts`'s existing posture. `isSupported(operation)` is the public surface the engine uses to reject unsupported plans before ever touching a file. `remove_silence` is a named MVP simplification: a `silencedetect` pass finds leading/trailing silence boundaries, then trims both audio and video together via the same `trim()` path — keeping A/V perfectly in sync, at the cost of not removing *interior* silent segments (that needs a second pass with a concat demuxer, deferred). `resize`'s four presets (`16:9`/`9:16`/`1:1`/`4:5`) map to fixed target dimensions via a scale-and-crop-to-fill filter chain. `brightness`'s Zod-bounded -100..100 level maps to ffmpeg's `eq` filter's -1..1 range.
- **`VideoExecutionEngineService.execute()`**: loads the plan (ownership-checked via the existing `VideoWorkflowPlanRepository.findById`), re-validates the stored workflow against `WorkflowSchema` (defense-in-depth — a `Json` column has no runtime schema guarantee at the database level even though the planner already validated it once), rejects wholesale if any step's operation isn't in `FFmpegVideoProvider.SUPPORTED_OPERATIONS`, loads the source `VideoAsset`, then runs every step sequentially inside one temp working directory (`env.videoUploadTempDir/execute-<uuid>/`) — the uploaded source is *copied*, never moved or renamed, into that directory first, so the original file is never touched. Each step's `outputPath` becomes the next step's `inputPath`. On any step's failure, execution stops immediately and a clean `VideoExecutionFailedError` (502) is thrown, naming the failed step. The whole working directory is removed in a `finally` block — covering both success and failure, and correctly no-op for the final output file, which `StorageProvider.save({sourcePath})` already moved out into the real storage root by the time cleanup runs. On success: the final file is `ffprobe`d for real metadata, saved via the existing `StorageProvider`, persisted as a new `VideoAsset(kind=EDITED_VIDEO, videoGroupId=<source's videoGroupId>, provider="ffmpeg", ...)` — reusing the source's `videoGroupId` (not a new FK) is what makes the edited video appear grouped with its source in `VideoAssetList` for free — and the originating plan is marked executed (`resultVideoAssetId`/`executedAt`). A fire-and-forget `AnalyticsEvent` follows the identical pattern every other generation path in this codebase already uses.
- **`StorageProvider.getAbsolutePath()`**: one small, additive interface method (implemented by exposing `LocalDiskStorageProvider`'s existing private `resolveWithinRoot`) so the execution engine can hand FFmpeg — a local CLI tool, not an HTTP client — a real filesystem path for the source video, without bypassing the storage abstraction.
- **API**: `POST /api/v1/video-edit/execute` (new, `authenticate`-only, Zod-inline validation matching `ChatController`/`VideoWorkflowPlannerController`). `GET /api/v1/video-edit/planner?projectId=` (new — `VideoWorkflowPlannerService.list()`, ownership-checked the same way `VideoAssetService.list()` already is). The pre-existing `POST /video-assets/generate` validator now also excludes `EDITED_VIDEO` from its allowed kinds — the identical regression class Sprint 7.2.1 already caught once for `UPLOADED_SOURCE`, caught again before it could ship this time.
- **Frontend**: `VideoWorkflowExecutor` — a new panel inside the existing Video tab (between the planner panel and `VideoGenerateForm`), showing a dropdown of previously generated workflow plans (each labeled with its source file name and prompt, flagged "(already executed)" once one has a result), an Execute Workflow button, and — once execution completes — the edited video's real `<video>` player and metadata, the same pattern `VideoSourceUpload`/`VideoWorkflowPlanner` already established. `types/video-asset.ts` gained `EDITED_VIDEO` in `VideoAssetKind` and `VIDEO_FILE_KINDS` (so `VideoAssetList`'s existing, kind-agnostic real-video-player branch renders it with zero new code) and a label in `VIDEO_KIND_LABELS`; deliberately excluded from `VIDEO_KIND_OPTIONS`, same posture as `UPLOADED_SOURCE`.

## Files Created / Modified

Backend — created: `src/providers/ffmpeg/ffmpeg-video.provider.ts` (+test), `src/services/video-execution-engine.service.ts` (+test), `src/controllers/video-execution.controller.ts` (+test), `src/routes/v1/video-execution.routes.ts`, `src/errors/video-execution.error.ts`, `src/validators/video-execution.validator.ts`, `src/repositories/video-workflow-plan.repository.test.ts`, migration `20260728010000_add_video_execution_engine`.
Backend — modified: `prisma/schema.prisma`, `src/app.ts`, `src/providers/interfaces/storage-provider.ts`, `src/providers/local-disk/local-disk-storage.provider.ts`, `src/repositories/video-workflow-plan.repository.ts`, `src/services/video-workflow-planner.service.ts` (+test), `src/controllers/video-workflow-planner.controller.ts` (+test), `src/routes/v1/video-workflow-planner.routes.ts`, `src/validators/video-workflow-plan.validator.ts`, `src/dto/video-workflow-plan.dto.ts`, `src/dto/video-workflow-plan.mapper.ts`, `src/dto/asset.mapper.ts`, `src/validators/video-asset.validator.ts`.
Frontend — created: `features/content-studio/api/video-execution.api.ts`, `features/content-studio/hooks/use-execute-workflow.ts`, `features/content-studio/hooks/use-video-workflow-plans.ts`, `features/content-studio/components/video-studio/VideoWorkflowExecutor.tsx` (+test).
Frontend — modified: `features/content-studio/api/video-workflow-planner.api.ts`, `features/content-studio/hooks/use-plan-video-workflow.ts`, `features/content-studio/types/video-asset.ts`, `features/content-studio/components/video-studio/VideoWorkflowPlanner.test.tsx` (new required DTO fields only), `features/content-studio/pages/project-workspace/ProjectWorkspace.tsx`.

## Database Changes

See "What Shipped" above — one additive enum value, two additive nullable columns on an existing model, zero changes to any other model. Migration applied and verified with zero drift.

## API Changes

- `POST /api/v1/video-edit/execute` (new) — `{ workflowPlanId }` → the resulting `EDITED_VIDEO` `VideoAsset`, synchronous.
- `GET /api/v1/video-edit/planner?projectId=` (new) — lists previously generated workflow plans for a project.
- `POST /video-assets/generate` — now also rejects `kind: "EDITED_VIDEO"` (previously would have silently accepted it once the enum grew, the same class of gap Sprint 7.2.1 fixed for `UPLOADED_SOURCE`).

## Tests

- Backend: 636/636 passing (29 new: `FFmpegVideoProvider` — each operation's ffmpeg args, silence detection/trim boundary logic, unsupported-operation rejection; `VideoExecutionEngineService` — full success path, sequential step-chaining, source-file-copied-not-moved, temp-dir cleanup on both success and failure, fire-and-forget analytics, not-found plan, invalid stored workflow, unsupported operation, missing source video, mid-execution step failure; `VideoWorkflowPlanRepository`'s three new methods; `VideoWorkflowPlannerService.list()`; both controllers). Typecheck clean; backend has no lint script.
- Frontend: full suite 368 tests, 364 passing / 4 failing — the same pre-existing, already-documented baseline (`search-provider.test.tsx` ×2, `user-auth-form.test.tsx` ×2), none in a file this sprint touched; 8 new tests (`VideoWorkflowExecutor`) all passing. Typecheck/lint clean (zero new errors on any changed or new file).

## Manual Validation

**Live-validated** against the real EYAN Studio development database, the real local Ollama instance, and real FFmpeg — via both direct API calls and two full real-browser Playwright sessions, using a throwaway backend/frontend instance on spare ports (production/dev instances untouched throughout):

- Uploaded a real `ffmpeg`-generated 6-second test video (~1s leading silence, ~4s tone, ~1s trailing silence) and asked the real planner for "Remove the silence, normalize the audio, increase the brightness a bit, and make it square (1:1)." — it correctly returned a 4-step plan using exactly the five executable operations.
- ✓ **Original video is unchanged**: the source file's byte size and 6.0s duration were identical before and after execution (copied, never moved).
- ✓ **Edited video is generated**: the output was correctly resized to 1080×1080, shortened to ~5.1s (confirming the leading/trailing silence was actually trimmed), and audio was normalized/brightened.
- ✓ **Edited video is stored correctly**: verified on disk at the real storage path, `ffprobe`-derived metadata persisted correctly.
- ✓ **Asset Library displays the edited asset**: confirmed via both direct API (`GET /assets`) and a real browser screenshot — both the "Edited Video" and "Uploaded Source" cards render correctly, correct provider (`ffmpeg`)/status (`Draft`) shown.
- ✓ **Review can access the edited asset**: confirmed via a real browser screenshot — the Review tab loads without error and correctly shows an empty "Needs Review" queue (both assets are still `DRAFT`, never submitted).
- ✓ **Metadata is preserved**: duration/resolution/format all correctly reflected in both the API response and the rendered UI.
- ✓ **Temporary files are removed**: confirmed no leftover `execute-*` directories after both a successful run and a rejected (unsupported-operation) run.
- ✓ **Unsupported workflows fail safely**: a plan containing `subtitles` was rejected with a clean `422` and zero side effects (no ffmpeg invocation, no `VideoAsset` created) — verified via direct API against a synthetically-inserted plan row (to avoid a second ~100s live-Ollama round trip just to reproduce this specific edge case; the rejection logic itself is exercised against the real, running server and a real database row, not mocked).
- ✓ Also confirmed: a missing `workflowPlanId` returns a clean `400` with no execution; a nonexistent `workflowPlanId` returns a clean `404`.
- ✓ **Real browser validation**: two full Playwright sessions (registration → sign-in → project creation → upload → real-Ollama plan generation → select workflow → Execute Workflow → real ffmpeg run → video preview → Asset Library → Review) confirmed the actual UI renders and behaves correctly throughout, including the executor's own result preview and the grouped source+edited video pair rendering side-by-side in the existing video list (a direct, visible consequence of reusing `videoGroupId` for the source/result relationship instead of a new column).

## Decisions Made

No new ADR — this milestone implements, without deviation, the Execution Engine exactly as scoped in the approved Sprint 7.2 architecture (reuse the Provider pattern for `FFmpegVideoProvider`, no registry since it's the one local implementation for these operations; synchronous execution, no job/queue infrastructure this milestone; reuse `VideoAsset`/Asset Library/Review/Analytics unchanged). Two small, necessary additions made during implementation, both flagged as such:

1. A `GET /api/v1/video-edit/planner?projectId=` listing endpoint — required for the frontend's explicit "select an existing workflow" requirement, which didn't exist when only planning itself was in scope (Sprint 7.2.2 named this as a likely future need, and it became a real one this milestone).
2. `POST /video-assets/generate`'s validator now also excludes `EDITED_VIDEO` — the same regression class caught for `UPLOADED_SOURCE` in Sprint 7.2.1, caught again here before shipping, since extending the shared `VideoAssetKind` enum a second time silently widened that endpoint's accepted input a second time.

## Follow-ups for Future Sprints

- Sprint 7.2.4 onward (per the approved architecture): `FasterWhisperProvider` for real `remove_silence` (interior segments, not just leading/trailing) and `subtitles`; Sprint 7.2.5's `OpenCvVideoAnalysisProvider` for `blur_faces`/`auto_zoom`, sequenced last with an explicit go/no-go performance checkpoint; Sprint 7.2.6 polish (job history UI, `background_music`, `shorts`).
- `remove_silence` only trims leading/trailing silence this milestone — removing *interior* silent segments needs a second pass (concat demuxer stitching non-silent segments back together), named but not built.
- No idempotency guard on re-executing an already-executed plan — `markExecuted()` is last-write-wins; executing the same plan twice produces two separate `EDITED_VIDEO` assets and simply overwrites which one the plan's `resultVideoAssetId` points to. Not asked for this milestone.
- No disk-space/CPU-time guard on execution beyond the fixed five-operation catalog's own bounded parameters — a hard per-execution timeout (killing a runaway ffmpeg process) is a natural addition once real, large uploaded files are exercised (still only small test videos have been used live, the same standing gap Sprint 7.2.1 already flagged).
- Asset Library's grid thumbnail still doesn't render a real preview for any real video file (`UPLOADED_SOURCE` or now `EDITED_VIDEO`) — unchanged, already-flagged gap from Sprint 7.2.1.

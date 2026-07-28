# Sprint 7.2.2 — AI Video Editing Pipeline: Workflow Planner

Status: Completed

## Goal

Let a user describe how they want to edit an uploaded video in plain English (e.g. "Remove silence, make it vertical, add subtitles and normalize the audio.") and have the AI convert that into a validated, structured editing plan. This is Milestone 2 of the Sprint 7.2 AI Video Editing Pipeline (per the approved architecture proposal) — the plan is only ever generated and stored, **never executed**. No FFmpeg execution, no Whisper, no OpenCV, no background workers, no job/queue infrastructure, no rendering, no progress tracking is in scope here; those belong to the Execution Engine milestone (7.2.3+).

## Scope

### In Scope

- A new, purely additive `VideoWorkflowPlan` model (prompt, validated workflow JSON, planning timestamp only — no execution state).
- `VideoWorkflowPlannerService`: builds a planner prompt from the source video's real `ffprobe` metadata (Sprint 7.2.1), calls the existing `ChatService`/Ollama provider directly (no new AI abstraction), parses the model's JSON response, validates it against a strict Zod schema of the fixed operation catalog, retries once on failure, and returns a clean, user-facing error if it still fails.
- `POST /api/v1/video-edit/planner` and a matching frontend "Plan an Edit" panel (source picker, prompt textarea, Generate Plan button, ordered step preview).

### Out of Scope (explicitly deferred to later milestones)

- Execution Engine, `VideoEditJob`, FFmpeg operations, Whisper transcription, OpenCV/MediaPipe analysis, background job infrastructure, progress tracking, rendering. None of these were implemented or stubbed.

## What Shipped

- **Database**: `VideoWorkflowPlan` (new model, additive only — zero changes to any of the 33 pre-existing models, including `VideoAsset`/`VideoAssetKind`, which needed no change this milestone). Stores `projectId`, `videoAssetId` (FK to the source `VideoAsset`, cascade), `prompt` (the user's original request, verbatim), `workflow` (`Json`, only ever the already-validated plan — same `Json`-column convention as `AssetReview.checklist`/`BrandKit.logos`/`McpServerConfig.settings`), `model` (which AI model produced it, for debugging), `createdBy`, `createdAt`. No status/lifecycle column — planning is a single synchronous request/response operation, like Sprint 7.2.1's ingestion, not a job. Migration `20260727223924_add_video_workflow_plan`, applied and verified against the real development database (`prisma migrate status` confirms zero drift).
- **Operation catalog + Zod schemas** (`validators/video-workflow-plan.validator.ts`): a `z.discriminatedUnion("operation", [...])` over the ten operations the user specified — `trim`, `remove_silence`, `normalize_audio`, `resize`, `shorts`, `subtitles`, `blur_faces`, `auto_zoom`, `brightness`, `background_music` — each with its own bounded, `.strict()` params schema (e.g. `resize.aspectRatio` is one of four presets; `brightness.level` is clamped to -100..100; `trim.endSec` must exceed `trim.startSec`, checked via `superRefine` over the whole steps array so every union member stays a plain `ZodObject` for the discriminant to resolve). Rejects unknown operations, missing/invalid/out-of-bounds parameters, unknown extra parameters, and malformed JSON — by construction, not by convention, since an LLM's output is treated as untrusted input reaching a downstream FFmpeg execution engine.
- **`VideoWorkflowPlannerService.plan()`**: looks up the source `VideoAsset` (ownership-checked via the existing `VideoAssetRepository.findById(id, userId)`), rejects anything that isn't `kind: "UPLOADED_SOURCE"` (only a real uploaded file has the `durationMs`/`width`/`height`/`videoFormat` the planner prompt is grounded in), builds a system prompt embedding that metadata plus the fixed operation catalog and an explicit "output ONLY JSON, no markdown, no code fences" instruction, then calls `ChatService.chat()` directly — the same precedent `VideoAssetService`'s text kinds already set (no new AI abstraction, no second "planner model": ADR-0001 already established this hardware has no room for one). The response is parsed (defensively stripping a markdown code fence first, since local models routinely wrap JSON in one despite instructions not to) and validated against `WorkflowSchema`. On failure (malformed JSON or a validation error), the model's own bad output plus the exact error is fed back in one corrective retry; if that also fails, a clean `WorkflowPlanningFailedError` (422) is thrown and nothing is persisted. On success, the validated plan is persisted via a new `VideoWorkflowPlanRepository`.
- **API**: `POST /api/v1/video-edit/planner` (`authenticate`-only, matching every other Content Studio route). Validation is Zod-inline in the controller (`PlanVideoWorkflowSchema.safeParse(req.body)`), mirroring `ChatController` exactly — this is a JSON-body endpoint, not multipart, so `chat.validator.ts`'s Zod pattern was the closer precedent than `video-source.validator.ts`'s `express-validator` field-by-field style.
- **Frontend**: `VideoWorkflowPlanner` — a new panel inside the existing Video tab (`ProjectWorkspace.tsx`), between `VideoSourceUpload` and `VideoGenerateForm`. A source picker (derived client-side from the already-fetched `useVideoAssets(projectId)` list, filtered to `isVideoFileKind`, the same derivation pattern `VideoGenerateForm`'s "attach to existing video" picker already uses), a prompt textarea, a Generate Plan button, and — once a plan comes back — an ordered, numbered step preview showing each operation's display label and its parameters. No execution controls, no progress UI, no editing UI: exactly what was asked for.

## Files Created / Modified

Backend — created: `src/validators/video-workflow-plan.validator.ts` (+test), `src/errors/video-workflow.error.ts`, `src/repositories/video-workflow-plan.repository.ts`, `src/services/video-workflow-planner.service.ts` (+test), `src/dto/video-workflow-plan.dto.ts`, `src/dto/video-workflow-plan.mapper.ts`, `src/controllers/video-workflow-planner.controller.ts` (+test), `src/routes/v1/video-workflow-planner.routes.ts`, migration `20260727223924_add_video_workflow_plan`.
Backend — modified: `prisma/schema.prisma` (new `VideoWorkflowPlan` model + back-relations on `ContentProject`/`VideoAsset`), `src/app.ts` (mounted the new route).
Frontend — created: `features/content-studio/api/video-workflow-planner.api.ts`, `features/content-studio/hooks/use-plan-video-workflow.ts`, `features/content-studio/components/video-studio/VideoWorkflowPlanner.tsx` (+test).
Frontend — modified: `features/content-studio/pages/project-workspace/ProjectWorkspace.tsx` (mounted the new panel).

## Database Changes

See "What Shipped" above — one new, purely additive model, no changes to any existing model. Migration applied and verified with zero drift.

## API Changes

- `POST /api/v1/video-edit/planner` (new) — `{ videoAssetId, prompt }` → a validated `{ steps: [...] }` workflow plan, persisted, never executed.

## Validation

- Build: clean (backend `tsc`, frontend `vite build`).
- Typecheck: clean on both sides.
- Lint: clean on all new/changed files (backend has no lint script; frontend `eslint` reports zero errors on every new/changed file).
- Tests: backend 607/607 passing (22 new: `WorkflowSchema`/`PlanVideoWorkflowSchema` validation rules, `VideoWorkflowPlannerService` — first-try success, code-fence stripping, retry-then-succeed on malformed JSON, retry-then-succeed on an invalid operation, exhausted-retries failure, not-found source, wrong-kind source — and `VideoWorkflowPlannerController`); frontend full suite 360 tests, 356 passing / 4 failing — the same pre-existing, already-documented baseline (`search-provider.test.tsx` ×2, `user-auth-form.test.tsx` ×2), none in a file this sprint touched; 7 new tests (`VideoWorkflowPlanner`) all passing.
- **Live-validated** against the real EYAN Studio development database, the real local Ollama instance (`qwen2.5-coder:7b`), and a throwaway backend/frontend instance on spare ports (production/dev instances untouched throughout): uploaded a real `ffmpeg`-generated test video, then called the planner with the user's own example prompt ("Remove silence, make it vertical, add subtitles and normalize the audio.") — the real model returned a correct plan (`remove_silence` → `shorts` → `subtitles` → `normalize_audio`) on the first attempt in ~99 seconds (consistent with this CPU-only hardware's documented ~3 tok/s profile, ADR-0001), confirmed persisted correctly in the database with no execution state. Also confirmed live: a missing `videoAssetId` returns a clean `404`; a missing `prompt` returns a clean `400` with no AI call made; planning against a non-`UPLOADED_SOURCE` asset (a `SCRIPT`-kind row, generated live) returns a clean `400` with no AI call made. A full real-browser Playwright session (registration → sign-in → project creation → Video tab → upload → select the uploaded source → describe the edit → Generate Plan) confirmed the actual UI renders and behaves correctly, including the real ~99-second wait for a genuine local-model response and a correctly-rendered ordered step preview.

## Decisions Made

No new ADR — this milestone implements, without deviation, the Workflow Planner exactly as scoped in the approved Sprint 7.2 architecture (reuse `ChatService` directly, no new AI abstraction; strict Zod validation of a fixed operation catalog as the defense against untrusted LLM output; planning is synchronous, no job/queue). One naming reconciliation, not a design decision: the task brief's operation names (`trim`, `resize`, `shorts`, `subtitles`, `auto_zoom`, `background_music`, ...) are used verbatim in the Zod schema and API, superseding the architecture proposal's slightly different equivalent names (`resize_aspect_ratio`, `add_subtitles`, `auto_zoom_speaker`, `add_background_music`) for this concrete implementation.

## Follow-ups for Future Sprints

- Sprint 7.2.3 onward (per the approved architecture): Execution Engine + `VideoEditJob`/`VideoJobStatus`, `VideoEditJobRunner` (in-process, concurrency-1), `FfmpegVideoProcessingProvider`, and the lowest-risk operations first (`trim`, `resize`, `normalize_audio`, `brightness`); then `FasterWhisperProvider` for `remove_silence`/`subtitles`; then `OpenCvVideoAnalysisProvider` for `blur_faces`/`auto_zoom`, sequenced last with an explicit go/no-go checkpoint on this hardware's real performance.
- No listing/history endpoint for previously generated plans exists yet — each plan is only ever shown as the mutation's own immediate result in the panel that generated it. A `GET /video-edit/planner?videoAssetId=` (or per-project) endpoint is a natural, low-risk addition whenever a "plan history" UI is wanted, but wasn't asked for this milestone.
- `background_music`'s `volume` parameter is planning-only — which actual second audio file gets mixed in is unresolved until a real audio-asset upload path exists, which is an Execution Engine-era concern, not this one's.
- The retry-once behavior has only been exercised live for the success path (the real model produced a valid plan on the first attempt every time it was tried live); the retry-after-malformed-output and retry-after-validation-failure paths are covered by unit tests with a mocked `ChatService`, not yet observed against a real model's actual malformed output.

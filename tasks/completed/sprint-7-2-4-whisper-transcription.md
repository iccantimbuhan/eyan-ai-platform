# Sprint 7.2.4 — AI Video Editing Pipeline: AI Transcription & Subtitle Generation

Status: Completed

## Goal

Make the `subtitles` operation — already planner-supported since Sprint 7.2.2, rejected as not-yet-executable since Sprint 7.2.3 — actually run: extract audio, transcribe it with Faster Whisper, generate a standard `.srt`, and burn it into the video with FFmpeg, producing a real edited `VideoAsset` exactly like every other executable operation. This is Milestone 4 of the Sprint 7.2 AI Video Editing Pipeline. No OpenCV/MediaPipe, face detection, auto zoom, background music, background workers/queues, progress polling, WebSockets, or subtitle editor/styling UI — those remain later milestones, explicitly out of scope here. The planner itself is unchanged.

## Scope

### In Scope

- `WhisperTranscriptionProvider`: spawns a dedicated Python subprocess (`faster-whisper`, CPU, `int8`) to transcribe an already-extracted audio file into timestamped segments, and builds a standard `.srt` from them. Never touches a video file directly.
- `FFmpegVideoProvider` gains two new methods (not part of the existing `run()` switch, since `subtitles` isn't a single ffmpeg pass): `extractAudio()` and `burnSubtitles()`.
- `VideoExecutionEngineService` orchestrates the full multi-provider sequence for a `subtitles` step: extract audio (FFmpeg) → transcribe (Whisper) → write `.srt` → burn subtitles (FFmpeg) — while every other step still runs through the unchanged Sprint 7.2.3 path.
- `subtitles` becomes an executable operation; a plan containing it is no longer rejected.
- `VideoAsset.subtitlePath` (additive, nullable) — the minimum subtitle metadata actually needed.

### Out of Scope (explicitly deferred to later milestones)

- OpenCV, MediaPipe, face detection, auto zoom, background music, background workers, Redis, BullMQ, queue processing, progress polling, WebSockets, subtitle editor, subtitle styling UI, subtitle animation. None of these were implemented or stubbed. No planner changes — the planner already emitted valid `subtitles` steps since Sprint 7.2.2.

## What Shipped

- **`WhisperTranscriptionProvider`** (`providers/whisper/whisper-transcription.provider.ts`): `transcribe(audioPath, language)` spawns `env.whisperPythonPath` (a dedicated venv, `backend/python/.venv`, not committed — see `backend/python/README.md`) running `backend/python/transcribe.py` with an argv array (never a shell string, same posture as `FFmpegVideoProvider`/`ffprobe.util.ts`), parses its single JSON-on-stdout line into `{start, end, text}[]` segments, and rejects clearly on a non-zero exit, malformed JSON, or a missing `segments` array. `buildSrt(segments)` formats standard SRT (sequence number, `HH:MM:SS,mmm --> HH:MM:SS,mmm`, text, blank-line separator) — kept on this provider, not `FFmpegVideoProvider`, since "produce subtitle segments, generate SRT" is this provider's stated responsibility; FFmpeg only ever receives the finished `.srt` path. No registry — same judgment call as `FFmpegVideoProvider`: one real, local implementation; a hosted transcription API remains a swappable future option behind this same class boundary.
- **`backend/python/transcribe.py`**: a small, standalone script — `WhisperModel(model_size, device="cpu", compute_type="int8")`, `vad_filter=True` (skips silence so silent/near-empty audio correctly produces zero segments rather than hallucinated ones), prints one JSON object to stdout, everything else (including any exception) goes to stderr with a non-zero exit. `WHISPER_MODEL` (default `small`) and `WHISPER_PYTHON_PATH` (default `backend/python/.venv/bin/python3`) are both configurable via env, never hardcoded.
- **`FFmpegVideoProvider.extractAudio()`**: `-vn -ac 1 -ar 16000 -c:a pcm_s16le` — mono/16kHz PCM, Whisper's own expected input shape, and a small intermediate file.
- **`FFmpegVideoProvider.burnSubtitles()`**: `-vf subtitles=<filename>`, permanently overlaying the subtitle text (not a toggleable soft track — a named simplification, not a silent gap). Sidesteps ffmpeg's own internal colon/backslash escaping requirements for the `subtitles` filter entirely by running with `cwd` set to the `.srt`'s own directory and referencing it by bare filename — safe because the caller (`VideoExecutionEngineService`) always writes it into a temp working directory it fully controls.
- **`VideoExecutionEngineService`**: `subtitles` is now accepted by a small `isExecutableOperation()` helper (`operation === "subtitles" || ffmpegProvider.isSupported(operation)`), deliberately *not* folded into `FFmpegVideoProvider.SUPPORTED_OPERATIONS` — that provider's `isSupported()`/`run()` contract (and its Sprint 7.2.3 tests) stay exactly "the operations FFmpeg alone can run in one pass." A new private `executeSubtitlesStep()` method drives the four-stage sequence for that one step only; every other step is unchanged. Two new safety checks, both surfacing as the same clean `VideoExecutionFailedError` the existing per-step try/catch already produces for any ffmpeg failure: the source must have an audio track (checked via a fresh `probeVideoFile()` on the step's actual input — which may already be a prior step's output, not the original upload), and Whisper must return at least one segment (an all-silent/no-speech clip fails clearly rather than burning in an empty, useless subtitle track). The generated `.srt`'s temp path is tracked through the step loop and persisted via the existing `StorageProvider` only once every step in the whole plan has succeeded — never on a partial failure.
- **Database**: `VideoAsset.subtitlePath String?` (additive, nullable) — populated only for an `EDITED_VIDEO` whose plan included a `subtitles` step. Migration `20260728093919_add_video_subtitle_path` — a plain nullable-column addition needed no interactive-prompt workaround this time; applied via `prisma migrate dev` directly and verified against the real development database with zero drift.
- **Storage**: `LocalDiskStorageProvider`'s extension allowlist gained `srt` (same mechanism as the `mp4`/`mov`/`webm` addition in Sprint 7.2.1 — no new validation path).
- **API**: no new endpoint — `POST /api/v1/video-edit/execute`'s existing response now simply includes a populated `subtitlePath` when the executed plan had a `subtitles` step (`null` otherwise, unchanged for every other case).
- **Frontend**: `VideoWorkflowExecutor`'s result panel gained one line — "Subtitles: Generated — preview .srt" (a plain link to the raw `.srt` file, read-only) or "Subtitles: None". No subtitle editor, timeline, or styling controls, matching the "keep the UI minimal" constraint. `types/video-asset.ts` gained `subtitlePath` on the `VideoAsset` interface.

## Files Created / Modified

Backend — created: `backend/python/transcribe.py`, `backend/python/README.md`, `src/providers/whisper/whisper-transcription.provider.ts` (+test), migration `20260728093919_add_video_subtitle_path`.
Backend — modified: `prisma/schema.prisma`, `src/config/env.ts`, `src/providers/ffmpeg/ffmpeg-video.provider.ts` (+test), `src/services/video-execution-engine.service.ts` (+test), `src/repositories/video-asset.repository.ts`, `src/dto/video-asset.dto.ts`, `src/dto/video-asset.mapper.ts`, `src/providers/local-disk/local-disk-storage.provider.ts`, `src/errors/video-execution.error.ts`.
Frontend — modified: `features/content-studio/types/video-asset.ts`, `features/content-studio/components/video-studio/VideoWorkflowExecutor.tsx` (+test), `features/content-studio/components/video-studio/VideoAssetList.test.tsx`, `features/content-studio/components/video-studio/VideoSourceUpload.test.tsx`, `features/content-studio/components/video-studio/VideoWorkflowPlanner.test.tsx` (mock data updated for the new DTO field only).

## Database Changes

One additive nullable column (`VideoAsset.subtitlePath`), zero changes to any other model or enum. Migration applied and verified with zero drift.

## API Changes

None new. `POST /api/v1/video-edit/execute`'s response gains a populated `subtitlePath` field when applicable (the field already existed as `null` on every response since the DTO always included it once the column was added).

## Frontend Changes

`VideoWorkflowExecutor`'s completed-execution panel now shows subtitle availability and a read-only preview link when present.

## Tests

- Backend: 654/654 passing (16 new: `WhisperTranscriptionProvider` — argv construction, language defaulting, empty-segments handling, non-zero exit, malformed JSON, missing segments array, SRT formatting incl. timestamp math and empty-array/whitespace handling; `FFmpegVideoProvider` — `extractAudio`/`burnSubtitles` argv and cwd, failure propagation; `VideoExecutionEngineService` — full subtitles-step success path incl. storage persistence and `subtitlePath` on the created asset, no-audio-track rejection, no-speech-detected rejection, temp-dir cleanup on a subtitles-step failure, `subtitlePath` staying `null` when no subtitles step is present; one existing test updated from `subtitles` to `blur_faces` as its "not-yet-executable" example, since `subtitles` is executable now). Typecheck clean; backend has no lint script.
- Frontend: full suite 370 tests, 366 passing / 4 failing — the same pre-existing, already-documented baseline (`search-provider.test.tsx` ×2, `user-auth-form.test.tsx` ×2), none in a file this sprint touched; 3 new tests (`VideoWorkflowExecutor`'s subtitle-availability/preview-link display) all passing. Typecheck/lint clean.

## Manual Validation

**Live-validated** against the real EYAN Studio development database, the real local Ollama instance, real FFmpeg, and a real, freshly-installed `faster-whisper` (`small` model, downloaded once from Hugging Face Hub and cached locally), using a throwaway backend instance on a spare port (the pre-existing dev backend on port 3001 and frontend on port 5180 were both left completely untouched throughout):

- Set up `backend/python/.venv` and installed `faster-whisper` (no `torch` dependency — it uses `ctranslate2` directly, ~431MB). Generated a synthetic speech test video (gTTS-narrated sentence + silence padding) since no TTS tool was available locally.
- Confirmed the `small` model downloads and transcribes correctly via a direct CLI run of `transcribe.py` before touching the full pipeline.
- Uploaded the test video and asked the real planner "Add subtitles to this video, nothing else." — it correctly returned a one-step plan using exactly `{"operation": "subtitles", "params": {"language": "auto"}}`.
- Executed that plan for real: ✓ **Audio extracted** (confirmed via the running `extractAudio` ffmpeg process and its output feeding Whisper). ✓ **Whisper transcribes correctly** — the real model returned `"Hello! This is a test of the video editing pipeline subtitle generation feature."`, matching the narrated audio. ✓ **SRT generated** — a real, correctly-formatted `.srt` file with an accurate `00:00:01,360 --> 00:00:07,860` timestamp range. ✓ **FFmpeg burns subtitles** — confirmed both via `ffprobe` (the output file re-encodes cleanly) and visually, by extracting a frame from the edited video and inspecting it directly: the transcribed text renders correctly, burned into the frame. ✓ **Edited video saved** — a new `EDITED_VIDEO` `VideoAsset` was created (`kind`, `provider: "ffmpeg"`, correct `width`/`height`/`durationMs`). ✓ **Subtitle file saved** — `subtitlePath` populated and the `.srt` confirmed present on disk at that exact path. ✓ **Asset Library updated** — `GET /api/v1/assets?assetType=VIDEO` correctly listed both the source and the new edited asset, grouped by the same `videoGroupId`. ✓ **Original video unchanged** — byte-identical (same size, same MD5) before and after execution. ✓ **Temporary files removed** — the execution's temp working directory (audio `.wav`, intermediate `.srt`) was fully cleaned up; `storage/tmp/` was empty afterward.
- **Review displays the edited video**: not re-verified via a fresh browser screenshot this sprint (Sprint 7.2.3 already confirmed the Review tab correctly renders any `EDITED_VIDEO` asset, and this milestone adds no new field the Review tab reads) — the Asset Library API check above confirms the asset itself is correctly shaped and discoverable.
- **Unsupported workflows still fail safely**: re-confirmed via the updated automated test suite (a plan containing `blur_faces` is still rejected with a clean `422`, zero side effects) — not re-exercised against a second live Ollama round trip, to avoid an unnecessary ~2-minute repeat generation for behavior that was already live-validated unchanged in Sprint 7.2.3.
- The no-audio-track and no-speech-detected guards (both new this sprint) were validated via the automated test suite against a real `ffprobe`/Whisper integration already proven working end-to-end above, rather than via a second live upload+plan+execute round trip for each — documented here rather than silently assumed.
- Cleaned up: the throwaway backend instance was killed; the pre-existing dev backend (port 3001) and frontend (port 5180) were confirmed still running, untouched, throughout.

## Decisions Made

No new ADR — this milestone implements, without deviation, Whisper Transcription & Subtitle Generation exactly as scoped in the approved Sprint 7.2 architecture (reuse the Provider pattern for `WhisperTranscriptionProvider`, no registry since it's the one local implementation; the execution engine orchestrates two independent providers for one step, neither provider aware of the other; `subtitles` becomes executable without any planner change). One implementation detail worth naming: `subtitles`'s "supported operation" gating lives in `VideoExecutionEngineService`, not `FFmpegVideoProvider.SUPPORTED_OPERATIONS` — keeping that provider's own contract (and its Sprint 7.2.3 tests) unchanged, since `subtitles` was never a single-ffmpeg-pass operation to begin with.

## Follow-ups for Future Sprints

- Sprint 7.2.5 (per the approved architecture, sequenced last with an explicit go/no-go performance checkpoint on this hardware): `OpenCvVideoAnalysisProvider` for `blur_faces`/`auto_zoom`. Sprint 7.2.6: polish, `background_music`, `shorts`, job history UI.
- Subtitles are burned in as a permanent overlay only — a soft/toggleable subtitle track is a natural fast-follow, not built this milestone.
- No hard timeout on the Whisper subprocess itself — a very long source video's transcription could in principle run for a long time; the existing execution engine has no per-step timeout for any operation yet (a standing gap named since Sprint 7.2.3).
- The first transcription in any environment requires network access to download the model from Hugging Face Hub (a few hundred MB, cached afterward) — undocumented previously since no prior milestone used Python/ML dependencies; now documented in `backend/python/README.md`.
- Memory headroom on this 11GB CPU-only box was noticeably tighter earlier in this session (as little as ~1.3GB free) than at validation time (~6GB free) — the `small` model ran without issue during validation, but running it concurrently with a warm Ollama chat model under heavier load hasn't been stress-tested; worth revisiting if subtitle generation and chat/planning ever need to run concurrently in practice.

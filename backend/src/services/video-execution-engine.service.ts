import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { VideoWorkflowPlanRepository } from "../repositories/video-workflow-plan.repository.js";
import { VideoAssetRepository } from "../repositories/video-asset.repository.js";
import { AnalyticsEventRepository } from "../repositories/analytics-event.repository.js";
import { StorageProviderFactory } from "../providers/storage-provider.factory.js";
import type { StorageProvider } from "../providers/interfaces/storage-provider.js";
import { FFmpegVideoProvider } from "../providers/ffmpeg/ffmpeg-video.provider.js";
import { WhisperTranscriptionProvider } from "../providers/whisper/whisper-transcription.provider.js";
import { probeVideoFile } from "../utils/ffprobe.util.js";
import { WorkflowSchema, type WorkflowStep } from "../validators/video-workflow-plan.validator.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  InvalidWorkflowPlanError,
  VideoExecutionFailedError,
} from "../errors/video-execution.error.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export interface ExecuteWorkflowInput {
  workflowPlanId: string;
}

// Sprint 7.2.4 — "subtitles" is executable, but not via
// FFmpegVideoProvider.run() (it isn't a single ffmpeg pass — see
// executeSubtitlesStep below); it's a step kind this service drives itself.
const SUBTITLES_OPERATION = "subtitles";

// Sprint 7.2.3 — runs an already-approved VideoWorkflowPlan (Sprint 7.2.2)
// step by step against FFmpegVideoProvider. No AI decisions are made here:
// the plan is executed exactly as stored, never re-interpreted. Sequential
// only (each step's output becomes the next step's input); stops
// immediately on the first failure. Synchronous request/response, like
// VideoSourceService.ingest() and VideoWorkflowPlannerService.plan() before
// it — no job/queue infrastructure exists yet, and this milestone doesn't
// introduce any. Sprint 7.2.4 extended this same loop with one more step
// kind ("subtitles") that spans two providers instead of one — see
// executeSubtitlesStep.
export class VideoExecutionEngineService {
  constructor(
    private readonly workflowPlanRepository = new VideoWorkflowPlanRepository(),
    private readonly videoAssetRepository = new VideoAssetRepository(),
    private readonly storageProvider: StorageProvider = StorageProviderFactory.create(),
    private readonly ffmpegProvider = new FFmpegVideoProvider(),
    private readonly analyticsEventRepository = new AnalyticsEventRepository(),
    private readonly whisperProvider = new WhisperTranscriptionProvider()
  ) {}

  async execute(data: ExecuteWorkflowInput, userId: string) {
    const plan = await this.workflowPlanRepository.findById(data.workflowPlanId, userId);

    if (!plan) {
      throw new NotFoundError("Workflow plan not found.");
    }

    // Defense-in-depth: the stored workflow was already validated when the
    // planner created it (Sprint 7.2.2), but a Json column has no runtime
    // schema guarantee at the database level, so it's re-validated here,
    // before anything is executed.
    const parsedWorkflow = WorkflowSchema.safeParse(plan.workflow);

    if (!parsedWorkflow.success) {
      throw new InvalidWorkflowPlanError();
    }

    // No separate "is this operation executable" pre-check: the Zod schema
    // re-validated above (video-workflow-plan.validator.ts) is now built
    // from the same shared EXECUTABLE_OPERATIONS list the planner and
    // FFmpegVideoProvider use, so a workflow that parses successfully can
    // only ever contain operations this engine can run. A legacy stored
    // plan predating that guarantee fails the parse above as
    // InvalidWorkflowPlanError instead.
    const steps = parsedWorkflow.data.steps;

    const sourceAsset = await this.videoAssetRepository.findById(plan.videoAssetId, userId);

    if (!sourceAsset || !sourceAsset.storagePath) {
      throw new NotFoundError("Source video not found.");
    }

    const workDir = path.join(env.videoUploadTempDir, `execute-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });

    try {
      // Copied, never moved or renamed — the uploaded source must remain
      // immutable no matter what happens to the rest of this pipeline.
      const sourceAbsolutePath = this.storageProvider.getAbsolutePath(sourceAsset.storagePath);
      let currentPath = path.join(workDir, "step-0-input.mp4");
      await copyFile(sourceAbsolutePath, currentPath);

      // Set only if the plan contains a "subtitles" step — the local temp
      // path of the generated .srt, persisted to storage after every step
      // has succeeded (never persisted on partial failure).
      let subtitleTempPath: string | null = null;

      for (const [index, step] of steps.entries()) {
        const outputPath = path.join(workDir, `step-${index + 1}-output.mp4`);

        try {
          if (step.operation === SUBTITLES_OPERATION) {
            subtitleTempPath = await this.executeSubtitlesStep(
              step,
              currentPath,
              outputPath,
              workDir,
              index
            );
          } else {
            await this.ffmpegProvider.run(step, currentPath, outputPath);
          }
        } catch (error) {
          logger.error(
            `[VideoExecutionEngineService] Step ${index + 1} ("${step.operation}") failed for plan ${plan.id}: ${errorMessageOf(error)}`
          );

          throw new VideoExecutionFailedError(
            `Execution failed at step ${index + 1} ("${step.operation}"). No edited video was produced.`
          );
        }

        currentPath = outputPath;
      }

      const probe = await probeVideoFile(currentPath);

      const saved = await this.storageProvider.save({
        projectId: sourceAsset.projectId,
        extension: "mp4",
        sourcePath: currentPath,
      });

      const savedSubtitles = subtitleTempPath
        ? await this.storageProvider.save({
            projectId: sourceAsset.projectId,
            extension: "srt",
            sourcePath: subtitleTempPath,
          })
        : null;

      const edited = await this.videoAssetRepository.create({
        projectId: sourceAsset.projectId,
        videoGroupId: sourceAsset.videoGroupId,
        kind: "EDITED_VIDEO",
        prompt: plan.prompt,
        provider: "ffmpeg",
        width: probe.width,
        height: probe.height,
        storagePath: saved.path,
        status: "COMPLETED",
        createdBy: userId,
        durationMs: probe.durationMs,
        videoFormat: probe.containerFormat,
        sourceFileName: sourceAsset.sourceFileName
          ? `edited-${sourceAsset.sourceFileName}`
          : "edited-video.mp4",
        subtitlePath: savedSubtitles?.path ?? null,
      });

      await this.workflowPlanRepository.markExecuted(plan.id, edited.id);

      this.recordAnalytics({ projectId: sourceAsset.projectId, sourceId: edited.id, userId });

      logger.info(
        `[VideoExecutionEngineService] Executed plan ${plan.id} -> video asset ${edited.id}.`
      );

      return edited;
    } finally {
      // Covers every temp file this run created (the copied source plus
      // every intermediate step output) whether execution succeeded or
      // failed — the final output was already moved out by
      // storageProvider.save() above, so this is a no-op for it.
      await rm(workDir, { recursive: true, force: true });
    }
  }

  // Sprint 7.2.4 — orchestrates the multi-provider "subtitles" step: extract
  // audio (FFmpeg) -> transcribe (Whisper) -> write .srt -> burn subtitles
  // into the video (FFmpeg). Each provider stays independent and unaware of
  // the other; only this method knows the full sequence. Returns the local
  // temp .srt path so the caller can persist it once the whole plan
  // succeeds — a step-level failure here is caught by execute()'s existing
  // per-step try/catch and rethrown as VideoExecutionFailedError exactly
  // like an ffmpeg-only step's failure.
  private async executeSubtitlesStep(
    step: Extract<WorkflowStep, { operation: "subtitles" }>,
    inputPath: string,
    outputPath: string,
    workDir: string,
    index: number
  ): Promise<string> {
    const probe = await probeVideoFile(inputPath);

    if (!probe.hasAudio) {
      throw new Error("Source video has no audio track; subtitles cannot be generated.");
    }

    const audioPath = path.join(workDir, `step-${index + 1}-audio.wav`);
    await this.ffmpegProvider.extractAudio(inputPath, audioPath);

    const segments = await this.whisperProvider.transcribe(audioPath, step.params.language);

    if (segments.length === 0) {
      throw new Error("No speech was detected in the source audio; subtitles could not be generated.");
    }

    const srtPath = path.join(workDir, `step-${index + 1}-subtitles.srt`);
    await writeFile(srtPath, this.whisperProvider.buildSrt(segments), "utf8");

    await this.ffmpegProvider.burnSubtitles(inputPath, srtPath, outputPath);

    return srtPath;
  }

  // Fire-and-forget, identical posture to VideoSourceService/VideoAssetService
  // — analytics must never interrupt or fail the execution response.
  private recordAnalytics(data: { projectId: string; sourceId: string; userId: string }): void {
    void this.analyticsEventRepository
      .create({
        projectId: data.projectId,
        assetType: "VIDEO",
        sourceId: data.sourceId,
        type: "GENERATED",
        actorId: data.userId,
        provider: "ffmpeg",
      })
      .catch((error) =>
        logger.error(
          `[VideoExecutionEngineService] Failed to record analytics event for ${data.sourceId}: ${errorMessageOf(error)}`
        )
      );
  }
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

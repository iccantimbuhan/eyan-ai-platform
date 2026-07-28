import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";

import { VideoAssetRepository } from "../repositories/video-asset.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { AnalyticsEventRepository } from "../repositories/analytics-event.repository.js";
import { StorageProviderFactory } from "../providers/storage-provider.factory.js";
import type { StorageProvider } from "../providers/interfaces/storage-provider.js";
import { probeVideoFile } from "../utils/ffprobe.util.js";
import { NotFoundError } from "../errors/auth.error.js";
import { InvalidVideoFileError } from "../errors/video-source.error.js";
import { logger } from "../lib/logger.js";

const ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "webm"]);

export interface IngestVideoSourceInput {
  projectId: string;
  // Omitted -> a new video (fresh videoGroupId), same convention as
  // VideoAssetService.generate(). Set -> attaches this upload to an
  // existing video's other artifacts (e.g. a script/storyboard already
  // generated for the same video).
  videoGroupId?: string;
  tempFilePath: string;
  originalFileName: string;
}

// Source ingestion only (Sprint 7.2.1) — no editing, no planner, no
// execution engine. This is a synchronous request/response operation
// (upload -> probe -> store -> persist), not a background job: ffprobe is
// fast, so there's no PENDING-then-update lifecycle here the way a slow
// AI provider call needs — a VideoAsset row is only ever created once
// every step below has already succeeded, mirroring how VideoAssetService
// never persists a partial text-kind row either.
export class VideoSourceService {
  constructor(
    private readonly repository = new VideoAssetRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly storageProvider: StorageProvider = StorageProviderFactory.create(),
    private readonly analyticsEventRepository = new AnalyticsEventRepository()
  ) {}

  async ingest(data: IngestVideoSourceInput, userId: string) {
    const project = await this.projectRepository.findById(data.projectId, userId);

    if (!project) {
      await deleteTempFile(data.tempFilePath);
      throw new NotFoundError("Project not found.");
    }

    const extension = extensionFromFileName(data.originalFileName);

    if (!extension) {
      await deleteTempFile(data.tempFilePath);
      throw new InvalidVideoFileError(
        `Unsupported or missing file extension on "${data.originalFileName}".`
      );
    }

    const probe = await this.probeOrReject(data.tempFilePath);
    const saved = await this.storeOrReject(data.projectId, extension, data.tempFilePath);

    const videoGroupId = data.videoGroupId ?? randomUUID();

    const created = await this.repository.create({
      projectId: data.projectId,
      videoGroupId,
      kind: "UPLOADED_SOURCE",
      prompt: data.originalFileName,
      provider: "upload",
      width: probe.width,
      height: probe.height,
      storagePath: saved.path,
      status: "COMPLETED",
      createdBy: userId,
      durationMs: probe.durationMs,
      videoFormat: probe.containerFormat,
      sourceFileName: data.originalFileName,
    });

    this.recordAnalytics({ projectId: data.projectId, sourceId: created.id, userId });

    return created;
  }

  private async probeOrReject(tempFilePath: string) {
    try {
      return await probeVideoFile(tempFilePath);
    } catch (error) {
      await deleteTempFile(tempFilePath);
      logger.warn(
        `[VideoSourceService] ffprobe rejected upload ${tempFilePath}: ${errorMessageOf(error)}`
      );
      throw new InvalidVideoFileError(
        "The uploaded file could not be read as a valid video."
      );
    }
  }

  private async storeOrReject(projectId: string, extension: string, tempFilePath: string) {
    try {
      return await this.storageProvider.save({
        projectId,
        extension,
        sourcePath: tempFilePath,
      });
    } catch (error) {
      await deleteTempFile(tempFilePath);
      logger.error(
        `[VideoSourceService] Storage failure for project ${projectId}: ${errorMessageOf(error)}`
      );
      throw new InvalidVideoFileError("Failed to store the uploaded video.");
    }
  }

  // Fire-and-forget: analytics must never interrupt the upload response.
  // Same posture and shape as VideoAssetService.recordAnalytics() — every
  // VideoAsset row, upload or generated, is AssetType.VIDEO. See
  // ADR-0011.
  private recordAnalytics(data: { projectId: string; sourceId: string; userId: string }): void {
    void this.analyticsEventRepository
      .create({
        projectId: data.projectId,
        assetType: "VIDEO",
        sourceId: data.sourceId,
        type: "GENERATED",
        actorId: data.userId,
        provider: "upload",
      })
      .catch((error) =>
        logger.error(
          `[VideoSourceService] Failed to record analytics event for ${data.sourceId}: ${errorMessageOf(error)}`
        )
      );
  }
}

// Best-effort cleanup of the multer-written temp file — must never throw
// itself, or a cleanup failure would mask the real error that triggered it.
async function deleteTempFile(tempFilePath: string): Promise<void> {
  try {
    await unlink(tempFilePath);
  } catch (error) {
    logger.warn(
      `[VideoSourceService] Failed to delete temp upload ${tempFilePath}: ${errorMessageOf(error)}`
    );
  }
}

function extensionFromFileName(fileName: string): string | null {
  const ext = path.extname(fileName).replace(/^\./, "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

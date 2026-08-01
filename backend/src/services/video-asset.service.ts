import { randomUUID } from "node:crypto";

import type {
  GenerateVideoAssetDto,
  ListVideoAssetsQueryDto,
} from "../dto/video-asset.dto.js";
import type { ImageFormat as PrismaImageFormat } from "../generated/prisma/enums.js";
import type {
  SavedFile,
  StorageProvider,
} from "../providers/interfaces/storage-provider.js";
import type {
  GenerateImageResponse,
  ImageProvider,
} from "../providers/interfaces/image-provider.js";

import { VideoAssetRepository } from "../repositories/video-asset.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { BrandKitRepository } from "../repositories/brand-kit.repository.js";
import { AnalyticsEventRepository } from "../repositories/analytics-event.repository.js";
import { aiCapabilityService, AiCapabilityService } from "./ai-capability.service.js";
import { ImageProviderFactory } from "../providers/image-provider.factory.js";
import { StorageProviderFactory } from "../providers/storage-provider.factory.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { NotFoundError } from "../errors/auth.error.js";
import { ApiError } from "../errors/api-error.js";
import {
  buildContentBrandGuidance,
  buildImageBrandGuidance,
} from "../dto/brand-kit-guidance.js";
import {
  isTextVideoKind,
  VIDEO_TEXT_KIND_AI_CONFIG,
  type TextVideoAssetKind,
} from "../config/video-prompts.js";
import {
  ImageGenerationError,
  ImageProviderNotConfiguredError,
} from "../errors/image-provider.error.js";

const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 512;
const DEFAULT_FORMAT = "png";

interface ImageProviderResolver {
  create(providerName?: string): ImageProvider;
}

// Text kinds call ChatService/OllamaProvider directly (mirrors
// ContentService.generate() exactly) rather than through a provider
// registry — this repo's hardware is deliberately single-text-provider
// (see .claude/decisions/ADR-0001-single-ai-provider-no-gateway.md), so a
// registry here would hold exactly one entry. Image kinds
// (STORYBOARD/THUMBNAIL) reuse ImageProviderFactory/StorageProvider,
// mirroring ImageService.generate() exactly, since that registry serves a
// real, current need (Gemini/ComfyUI/Hugging Face). See
// docs/ASSET_LIBRARY.md.
export class VideoAssetService {
  constructor(
    private readonly repository = new VideoAssetRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly brandKitRepository = new BrandKitRepository(),
    private readonly capabilityService: AiCapabilityService = aiCapabilityService,
    private readonly imageProviderFactory: ImageProviderResolver = ImageProviderFactory,
    private readonly storageProvider: StorageProvider = StorageProviderFactory.create(),
    private readonly analyticsEventRepository = new AnalyticsEventRepository()
  ) {}

  async generate(data: GenerateVideoAssetDto, userId: string) {
    const project = await this.projectRepository.findById(data.projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    // Omitted -> a new video (fresh group). Set -> attaches this artifact to
    // an existing video's other artifacts, with no second project-level
    // entity to represent "a video".
    const videoGroupId = data.videoGroupId ?? randomUUID();

    return isTextVideoKind(data.kind)
      ? this.generateText(data, userId, videoGroupId)
      : this.generateImage(data, userId, videoGroupId);
  }

  private async generateText(
    data: GenerateVideoAssetDto,
    userId: string,
    videoGroupId: string
  ) {
    let brandGuidance = "";

    if (data.brandKitId) {
      const brandKit = await this.resolveBrandKit(data.brandKitId, data.projectId, userId);
      brandGuidance = buildContentBrandGuidance(brandKit);
    }

    // Text kinds are only ever persisted after a successful invoke() call —
    // no partial row, status always COMPLETED at creation. Same posture as
    // ContentService.generate().
    const startedAt = Date.now();

    // Safe: generate() only ever reaches here after its own
    // isTextVideoKind(data.kind) check — TS can't see that link across the
    // two methods.
    const { capabilityKey } = VIDEO_TEXT_KIND_AI_CONFIG[data.kind as TextVideoAssetKind];
    const result = await this.capabilityService.invoke(
      capabilityKey,
      { prompt: data.prompt, brandGuidance },
      { expectJson: false },
      userId
    );

    // AiRoutingService never throws on a provider-call failure (it reports
    // outcome/needsManualReview instead) — surfaced as an error here the
    // way this method always has, matching ContentService.generate()'s
    // identical adaptation (Sprint 3 Phase 2).
    if (result.outcome !== "VALID") {
      throw new ApiError(503, "Unable to connect to AI provider.");
    }

    const generationTimeMs = Date.now() - startedAt;

    const created = await this.repository.create({
      projectId: data.projectId,
      brandKitId: data.brandKitId ?? null,
      videoGroupId,
      kind: data.kind,
      prompt: data.prompt,
      output: result.output,
      model: result.model,
      status: "COMPLETED",
      generationTimeMs,
      createdBy: userId,
    });

    this.recordAnalytics({
      projectId: data.projectId,
      sourceId: created.id,
      userId,
      // Sourced from AI Core's own resolved chain rather than a hardcoded
      // constant (Sprint 3 Phase 4) — see ContentService's identical change.
      provider: result.provider,
      model: result.model,
      generationTimeMs,
      brandKitId: data.brandKitId,
    });

    return created;
  }

  private async generateImage(
    data: GenerateVideoAssetDto,
    userId: string,
    videoGroupId: string
  ) {
    const width = data.width ?? DEFAULT_WIDTH;
    const height = data.height ?? DEFAULT_HEIGHT;
    const format = data.format ?? DEFAULT_FORMAT;

    // Same separation ImageService keeps: the row always stores the user's
    // original prompt; generationPrompt is what's actually sent to the
    // provider.
    let generationPrompt = data.prompt;

    if (data.brandKitId) {
      const brandKit = await this.resolveBrandKit(data.brandKitId, data.projectId, userId);
      const guidance = buildImageBrandGuidance(brandKit);

      if (guidance) {
        generationPrompt = `${guidance}\n\n${generationPrompt}`;
      }
    }

    // Configuration errors surface before anything is persisted — same as
    // ImageService.
    const provider = this.imageProviderFactory.create(
      this.resolveProviderName(data.provider)
    );

    let video: Awaited<ReturnType<VideoAssetRepository["create"]>>;

    try {
      video = await this.repository.create({
        projectId: data.projectId,
        brandKitId: data.brandKitId ?? null,
        videoGroupId,
        kind: data.kind,
        prompt: data.prompt,
        provider: provider.name,
        width,
        height,
        format: toPrismaFormat(format),
        status: "PENDING",
        createdBy: userId,
      });
    } catch (error) {
      logger.error(
        `[VideoAssetService] Database failure creating video asset record for project ${data.projectId}: ${errorMessageOf(error)}`
      );

      throw error;
    }

    logger.info(
      `[VideoAssetService] Generation started: video asset ${video.id}, kind "${data.kind}", provider "${provider.name}", project ${data.projectId}.`
    );

    let result: GenerateImageResponse;

    const startedAt = Date.now();

    try {
      result = await provider.generate({
        prompt: generationPrompt,
        width,
        height,
        format,
      });
    } catch (error) {
      const message = errorMessageOf(error);

      logger.error(
        `[VideoAssetService] Provider "${provider.name}" failed for video asset ${video.id}: ${message}`
      );

      await this.markFailed(video.id, message);

      throw new ImageGenerationError(
        "Video asset generation failed. Please try again, or try a different provider."
      );
    }

    const generationTimeMs = Date.now() - startedAt;

    logger.info(
      `[VideoAssetService] Provider "${provider.name}" generated video asset ${video.id} successfully.`
    );

    let stored: SavedFile;

    try {
      stored = await this.storageProvider.save({
        buffer: result.buffer,
        projectId: data.projectId,
        extension: result.format,
      });
    } catch (error) {
      const message = errorMessageOf(error);

      logger.error(
        `[VideoAssetService] Storage failed for video asset ${video.id}: ${message}`
      );

      await this.markFailed(video.id, message);

      throw new ImageGenerationError(
        "The video asset was generated but could not be saved. Please try again."
      );
    }

    try {
      const completed = await this.repository.update(video.id, {
        status: "COMPLETED",
        model: result.model,
        storagePath: stored.path,
        generationTimeMs,
      });

      logger.info(`[VideoAssetService] Video asset ${video.id} completed successfully.`);

      this.recordAnalytics({
        projectId: data.projectId,
        sourceId: video.id,
        userId,
        provider: provider.name,
        model: result.model,
        generationTimeMs,
        brandKitId: data.brandKitId,
      });

      return completed;
    } catch (error) {
      // Deliberately not marked FAILED and not wrapped — generation and
      // storage both already succeeded. Same reasoning as ImageService.
      logger.error(
        `[VideoAssetService] Generated and stored video asset ${video.id}, but failed to persist COMPLETED status: ${errorMessageOf(error)}`
      );

      throw error;
    }
  }

  // Fire-and-forget: analytics must never interrupt the generation
  // workflow, and there's no invariant (unlike a file delete) requiring
  // this write to finish before responding. Shared by both the text and
  // image generation paths — every VideoAsset row is AssetType.VIDEO
  // regardless of kind. See ADR-0011.
  private recordAnalytics(data: {
    projectId: string;
    sourceId: string;
    userId: string;
    provider: string;
    model: string;
    generationTimeMs: number;
    brandKitId?: string | null;
  }): void {
    void this.analyticsEventRepository
      .create({
        projectId: data.projectId,
        assetType: "VIDEO",
        sourceId: data.sourceId,
        type: "GENERATED",
        actorId: data.userId,
        provider: data.provider,
        model: data.model,
        generationTimeMs: data.generationTimeMs,
        brandKitId: data.brandKitId ?? null,
      })
      .catch((error) =>
        logger.error(
          `[VideoAssetService] Failed to record analytics event for ${data.sourceId}: ${errorMessageOf(error)}`
        )
      );
  }

  private async resolveBrandKit(brandKitId: string, projectId: string, userId: string) {
    const brandKit = await this.brandKitRepository.findById(brandKitId, userId);

    if (!brandKit || brandKit.projectId !== projectId) {
      throw new NotFoundError("Brand kit not found.");
    }

    return brandKit;
  }

  async list(query: ListVideoAssetsQueryDto, userId: string) {
    const project = await this.projectRepository.findById(query.projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const filters = { videoGroupId: query.videoGroupId, kind: query.kind };

    const [items, total] = await Promise.all([
      this.repository.findMany({
        projectId: query.projectId,
        userId,
        skip,
        take: pageSize,
        ...filters,
      }),
      this.repository.count(query.projectId, userId, filters),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string, userId: string) {
    const video = await this.repository.findById(id, userId);

    if (!video) {
      throw new NotFoundError("Video asset not found.");
    }

    return video;
  }

  async delete(id: string, userId: string) {
    const video = await this.getById(id, userId);

    // Best-effort, same reasoning as ImageService.delete(): a user must
    // always be able to remove a video asset even if disk cleanup fails.
    if (video.storagePath) {
      try {
        await this.storageProvider.delete(video.storagePath);
      } catch (error) {
        logger.error(
          `[VideoAssetService] Failed to delete stored file for video asset ${id}: ${errorMessageOf(error)}`
        );
      }
    }

    const deleted = await this.repository.delete(id);

    logger.info(`[VideoAssetService] Deleted video asset ${id}.`);

    return deleted;
  }

  // Same provider selection strategy as ImageService — reused directly
  // since STORYBOARD/THUMBNAIL generation goes through the identical
  // ImageProviderFactory/IMAGE_PROVIDER configuration.
  private resolveProviderName(requested?: string): string {
    const explicit = requested?.trim();
    const providerName = explicit || env.imageProvider;

    if (!providerName) {
      throw new ImageProviderNotConfiguredError();
    }

    return providerName;
  }

  private async markFailed(videoAssetId: string, rawMessage: string): Promise<void> {
    try {
      await this.repository.update(videoAssetId, {
        status: "FAILED",
        errorMessage: rawMessage,
      });
    } catch (updateError) {
      logger.error(
        `[VideoAssetService] Failed to persist FAILED status for video asset ${videoAssetId}: ${errorMessageOf(updateError)}`
      );
    }
  }
}

function toPrismaFormat(format: string): PrismaImageFormat {
  return format.toUpperCase() as PrismaImageFormat;
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const videoAssetService = new VideoAssetService();

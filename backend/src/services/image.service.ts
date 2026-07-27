import type { GenerateImageDto, ListImagesQueryDto } from "../dto/image.dto.js";
import type { ImageFormat as PrismaImageFormat } from "../generated/prisma/enums.js";
import type {
  SavedFile,
  StorageProvider,
} from "../providers/interfaces/storage-provider.js";
import type {
  GenerateImageResponse,
  ImageProvider,
} from "../providers/interfaces/image-provider.js";

import { ImageRepository } from "../repositories/image.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { BrandKitRepository } from "../repositories/brand-kit.repository.js";
import { AnalyticsEventRepository } from "../repositories/analytics-event.repository.js";
import { ImageProviderFactory } from "../providers/image-provider.factory.js";
import { StorageProviderFactory } from "../providers/storage-provider.factory.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { NotFoundError } from "../errors/auth.error.js";
import { buildImageBrandGuidance } from "../dto/brand-kit-guidance.js";
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

export class ImageService {
  constructor(
    private readonly repository = new ImageRepository(),
    private readonly projectRepository = new ProjectRepository(),
    private readonly imageProviderFactory: ImageProviderResolver = ImageProviderFactory,
    private readonly storageProvider: StorageProvider = StorageProviderFactory.create(),
    private readonly brandKitRepository = new BrandKitRepository(),
    private readonly analyticsEventRepository = new AnalyticsEventRepository(),
  ) {}

  async generate(data: GenerateImageDto, userId: string) {
    const project = await this.projectRepository.findById(
      data.projectId,
      userId
    );

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const width = data.width ?? DEFAULT_WIDTH;
    const height = data.height ?? DEFAULT_HEIGHT;
    const format = data.format ?? DEFAULT_FORMAT;

    // The row always stores the user's original prompt (data.prompt);
    // generationPrompt is what's actually sent to the provider — keeps
    // "what did the user ask for" and "what did we actually generate from"
    // distinguishable, matching how ContentService keeps data.prompt
    // separate from its brand-augmented system prompt.
    let generationPrompt = data.prompt;

    if (data.brandKitId) {
      const brandKit = await this.brandKitRepository.findById(
        data.brandKitId,
        userId
      );

      if (!brandKit || brandKit.projectId !== data.projectId) {
        throw new NotFoundError("Brand kit not found.");
      }

      const guidance = buildImageBrandGuidance(brandKit);

      if (guidance) {
        generationPrompt = `${guidance}\n\n${generationPrompt}`;
      }
    }

    // Configuration errors (unset/unknown provider) surface before anything
    // is persisted — there's no partial row to clean up or mark FAILED.
    const provider = this.imageProviderFactory.create(
      this.resolveProviderName(data.provider)
    );

    let image: Awaited<ReturnType<ImageRepository["create"]>>;

    try {
      image = await this.repository.create({
        projectId: data.projectId,
        brandKitId: data.brandKitId ?? null,
        prompt: data.prompt,
        negativePrompt: data.negativePrompt ?? null,
        provider: provider.name,
        width,
        height,
        format: toPrismaFormat(format),
      });
    } catch (error) {
      logger.error(
        `[ImageService] Database failure creating image record for project ${data.projectId}: ${errorMessageOf(error)}`
      );

      throw error;
    }

    logger.info(
      `[ImageService] Generation started: image ${image.id}, provider "${provider.name}", project ${data.projectId}.`
    );

    let result: GenerateImageResponse;

    // Captured for Asset Details' "Generation Time" field (Sprint 5) — pure
    // timing around the existing call, no change to control flow or errors.
    const startedAt = Date.now();

    try {
      result = await provider.generate({
        prompt: generationPrompt,
        negativePrompt: data.negativePrompt,
        width,
        height,
        format,
      });
    } catch (error) {
      const message = errorMessageOf(error);

      logger.error(
        `[ImageService] Provider "${provider.name}" failed for image ${image.id}: ${message}`
      );

      await this.markFailed(image.id, message);

      // The underlying error (which may include vendor-internal detail) is
      // persisted to errorMessage for the owning user to inspect via
      // GET /images/:id, but never forwarded verbatim in the immediate HTTP
      // response — a generic, safe message goes to the client instead.
      throw new ImageGenerationError(
        "Image generation failed. Please try again, or try a different provider."
      );
    }

    const generationTimeMs = Date.now() - startedAt;

    logger.info(
      `[ImageService] Provider "${provider.name}" generated image ${image.id} successfully.`
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
        `[ImageService] Storage failed for image ${image.id}: ${message}`
      );

      await this.markFailed(image.id, message);

      throw new ImageGenerationError(
        "The image was generated but could not be saved. Please try again."
      );
    }

    try {
      const completed = await this.repository.update(image.id, {
        status: "COMPLETED",
        model: result.model,
        storagePath: stored.path,
        generationTimeMs,
      });

      logger.info(`[ImageService] Image ${image.id} completed successfully.`);

      // Fire-and-forget: analytics must never interrupt the generation
      // workflow, and there's no invariant (unlike a file delete) requiring
      // this write to finish before responding. See ADR-0011.
      void this.analyticsEventRepository
        .create({
          projectId: data.projectId,
          assetType: "IMAGE",
          sourceId: image.id,
          type: "GENERATED",
          actorId: userId,
          provider: provider.name,
          model: result.model,
          generationTimeMs,
          brandKitId: data.brandKitId ?? null,
        })
        .catch((error) =>
          logger.error(
            `[ImageService] Failed to record analytics event for ${image.id}: ${errorMessageOf(error)}`
          )
        );

      return completed;
    } catch (error) {
      // Deliberately not marked FAILED and not wrapped: generation and
      // storage both already succeeded, so a failure here is a DB-layer
      // error, not a generation failure — the file already exists on disk.
      // Re-marking FAILED would misreport a successful generation.
      logger.error(
        `[ImageService] Generated and stored image ${image.id}, but failed to persist COMPLETED status: ${errorMessageOf(error)}`
      );

      throw error;
    }
  }

  async list(query: ListImagesQueryDto, userId: string) {
    const project = await this.projectRepository.findById(
      query.projectId,
      userId
    );

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.repository.findMany({
        projectId: query.projectId,
        userId,
        skip,
        take: pageSize,
      }),
      this.repository.count(query.projectId, userId),
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
    const image = await this.repository.findById(id, userId);

    if (!image) {
      throw new NotFoundError("Generated image not found.");
    }

    return image;
  }

  async delete(id: string, userId: string) {
    const image = await this.getById(id, userId);

    // Best-effort: a user must always be able to remove an image from their
    // history even if disk cleanup fails (permissions, a stale mount,
    // ...). The metadata row is the source of truth for "does this image
    // exist to the user" — losing that to a storage hiccup would leave an
    // undeletable ghost row, which is worse than an orphaned file logged
    // for follow-up.
    if (image.storagePath) {
      try {
        await this.storageProvider.delete(image.storagePath);
      } catch (error) {
        logger.error(
          `[ImageService] Failed to delete stored file for image ${id}: ${errorMessageOf(error)}`
        );
      }
    }

    const deleted = await this.repository.delete(id);

    logger.info(`[ImageService] Deleted image ${id}.`);

    return deleted;
  }

  // Provider selection strategy: an explicit per-request override wins;
  // otherwise fall back to the configured default (IMAGE_PROVIDER). If
  // neither is set, fail with a clear, dedicated error rather than letting
  // an empty string reach ImageProviderFactory.create() and surface as a
  // confusing 'Unsupported image provider: ""'.
  private resolveProviderName(requested?: string): string {
    const explicit = requested?.trim();
    const providerName = explicit || env.imageProvider;

    if (!providerName) {
      throw new ImageProviderNotConfiguredError();
    }

    logger.debug(
      `[ImageService] Resolved image provider "${providerName}" (${
        explicit ? "explicit request override" : "configured default"
      }).`
    );

    return providerName;
  }

  // Best-effort: marking a generation FAILED is itself a DB write that can
  // fail (e.g. the DB is the reason generation failed in the first place).
  // That secondary failure is logged distinctly rather than replacing the
  // original, more useful error the caller is about to see.
  private async markFailed(imageId: string, rawMessage: string): Promise<void> {
    try {
      await this.repository.update(imageId, {
        status: "FAILED",
        errorMessage: rawMessage,
      });
    } catch (updateError) {
      logger.error(
        `[ImageService] Failed to persist FAILED status for image ${imageId}: ${errorMessageOf(updateError)}`
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

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
import { ImageProviderFactory } from "../providers/image-provider.factory.js";
import { StorageProviderFactory } from "../providers/storage-provider.factory.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { NotFoundError } from "../errors/auth.error.js";
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

    const provider = this.imageProviderFactory.create(
      this.resolveProviderName(data.provider)
    );

    const image = await this.repository.create({
      projectId: data.projectId,
      prompt: data.prompt,
      negativePrompt: data.negativePrompt ?? null,
      provider: provider.name,
      width,
      height,
      format: toPrismaFormat(format),
    });

    logger.info(
      `[ImageService] Generating image ${image.id} via provider "${provider.name}" for project ${data.projectId}`
    );

    // Provider/storage failures are recoverable at the metadata level — the
    // row is marked FAILED so the caller can see and retry. A failure to
    // persist that FAILED status itself (a DB-layer problem, not a
    // generation problem) is logged separately rather than masking the
    // original error.
    let result: GenerateImageResponse;
    let stored: SavedFile;

    try {
      result = await provider.generate({
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        width,
        height,
        format,
      });

      stored = await this.storageProvider.save({
        buffer: result.buffer,
        projectId: data.projectId,
        extension: result.format,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      logger.error(
        `[ImageService] Generation failed for image ${image.id}: ${message}`
      );

      try {
        await this.repository.update(image.id, {
          status: "FAILED",
          errorMessage: message,
        });
      } catch (updateError) {
        const updateMessage =
          updateError instanceof Error ? updateError.message : "Unknown error";

        logger.error(
          `[ImageService] Failed to persist FAILED status for image ${image.id}: ${updateMessage}`
        );
      }

      throw new ImageGenerationError(message);
    }

    // Deliberately outside the try/catch above: generation and storage both
    // succeeded at this point, so a failure here is a DB-layer error, not a
    // generation failure. Re-marking the row FAILED would misreport a
    // successful generation whose file already exists on disk.
    const completed = await this.repository.update(image.id, {
      status: "COMPLETED",
      model: result.model,
      storagePath: stored.path,
    });

    logger.info(`[ImageService] Image ${image.id} completed successfully.`);

    return completed;
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
    // undeletable ghost row, which is worse than a orphaned file logged
    // for follow-up.
    if (image.storagePath) {
      try {
        await this.storageProvider.delete(image.storagePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        logger.error(
          `[ImageService] Failed to delete stored file for image ${id}: ${message}`
        );
      }
    }

    return this.repository.delete(id);
  }

  // Provider selection strategy: an explicit per-request override wins;
  // otherwise fall back to the configured default (IMAGE_PROVIDER). If
  // neither is set, fail with a clear, dedicated error rather than letting
  // an empty string reach ImageProviderFactory.create() and surface as a
  // confusing 'Unsupported image provider: ""'.
  private resolveProviderName(requested?: string): string {
    const providerName = requested?.trim() || env.imageProvider;

    if (!providerName) {
      throw new ImageProviderNotConfiguredError();
    }

    return providerName;
  }
}

function toPrismaFormat(format: string): PrismaImageFormat {
  return format.toUpperCase() as PrismaImageFormat;
}

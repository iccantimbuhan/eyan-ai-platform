import type { GenerateImageDto, ListImagesQueryDto } from "../dto/image.dto.js";
import type { ImageFormat as PrismaImageFormat } from "../generated/prisma/enums.js";
import type { StorageProvider } from "../providers/interfaces/storage-provider.js";
import type { ImageProvider } from "../providers/interfaces/image-provider.js";

import { ImageRepository } from "../repositories/image.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { ImageProviderFactory } from "../providers/image-provider.factory.js";
import { StorageProviderFactory } from "../providers/storage-provider.factory.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { NotFoundError } from "../errors/auth.error.js";
import { ImageGenerationError } from "../errors/image-provider.error.js";

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

    const provider = this.imageProviderFactory.create(data.provider ?? env.imageProvider);

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

    try {
      const result = await provider.generate({
        prompt: data.prompt,
        negativePrompt: data.negativePrompt,
        width,
        height,
        format,
      });

      const stored = await this.storageProvider.save({
        buffer: result.buffer,
        projectId: data.projectId,
        extension: result.format,
      });

      const completed = await this.repository.update(image.id, {
        status: "COMPLETED",
        model: result.model,
        storagePath: stored.path,
      });

      logger.info(`[ImageService] Image ${image.id} completed successfully.`);

      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      logger.error(
        `[ImageService] Generation failed for image ${image.id}: ${message}`
      );

      await this.repository.update(image.id, {
        status: "FAILED",
        errorMessage: message,
      });

      throw new ImageGenerationError(message);
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
    await this.getById(id, userId);

    return this.repository.delete(id);
  }
}

function toPrismaFormat(format: string): PrismaImageFormat {
  return format.toUpperCase() as PrismaImageFormat;
}

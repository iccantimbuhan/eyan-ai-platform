import { prisma } from "../lib/prisma.js";
import type {
  GenerationStatus,
  ImageFormat,
} from "../generated/prisma/enums.js";

export class ImageRepository {
  async create(data: {
    projectId: string;
    brandKitId?: string | null;
    prompt: string;
    negativePrompt?: string | null;
    provider: string;
    width: number;
    height: number;
    format: ImageFormat;
  }) {
    return prisma.generatedImage.create({
      data,
    });
  }

  async update(
    id: string,
    data: {
      status?: GenerationStatus;
      model?: string | null;
      storagePath?: string | null;
      thumbnailPath?: string | null;
      errorMessage?: string | null;
      generationTimeMs?: number | null;
    }
  ) {
    return prisma.generatedImage.update({
      where: { id },
      data,
    });
  }

  async findById(id: string, userId: string) {
    return prisma.generatedImage.findFirst({
      where: { id, project: { userId } },
    });
  }

  async findMany(options: {
    projectId: string;
    userId: string;
    skip: number;
    take: number;
  }) {
    return prisma.generatedImage.findMany({
      where: {
        projectId: options.projectId,
        project: { userId: options.userId },
      },

      skip: options.skip,
      take: options.take,

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async count(projectId: string, userId: string) {
    return prisma.generatedImage.count({
      where: { projectId, project: { userId } },
    });
  }

  async delete(id: string) {
    return prisma.generatedImage.delete({
      where: { id },
    });
  }
}

export const imageRepository = new ImageRepository();

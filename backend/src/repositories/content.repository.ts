import { prisma } from "../lib/prisma.js";
import type { ContentType } from "../generated/prisma/enums.js";

export class ContentRepository {
  async create(data: {
    projectId: string;
    type: ContentType;
    prompt: string;
    output: string;
    model: string;
    createdBy?: string | null;
    generationTimeMs?: number | null;
  }) {
    return prisma.generatedContent.create({
      data,
    });
  }

  async findById(id: string, userId: string) {
    return prisma.generatedContent.findFirst({
      where: { id, project: { userId } },
    });
  }

  async findMany(options: {
    projectId: string;
    userId: string;
    skip: number;
    take: number;
  }) {
    return prisma.generatedContent.findMany({
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
    return prisma.generatedContent.count({
      where: { projectId, project: { userId } },
    });
  }

  async delete(id: string) {
    return prisma.generatedContent.delete({
      where: { id },
    });
  }
}

export const contentRepository = new ContentRepository();

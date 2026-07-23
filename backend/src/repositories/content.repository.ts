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
  }) {
    return prisma.generatedContent.create({
      data,
    });
  }

  async findById(id: string) {
    return prisma.generatedContent.findUnique({
      where: { id },
    });
  }

  async findMany(options: {
    projectId: string;
    skip: number;
    take: number;
  }) {
    return prisma.generatedContent.findMany({
      where: { projectId: options.projectId },

      skip: options.skip,
      take: options.take,

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async count(projectId: string) {
    return prisma.generatedContent.count({
      where: { projectId },
    });
  }

  async delete(id: string) {
    return prisma.generatedContent.delete({
      where: { id },
    });
  }
}

export const contentRepository = new ContentRepository();

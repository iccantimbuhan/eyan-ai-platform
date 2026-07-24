import { prisma } from "../lib/prisma.js";

export class ImageRepository {
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

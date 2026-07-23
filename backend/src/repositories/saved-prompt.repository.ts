import { prisma } from "../lib/prisma.js";
import type { ContentType } from "../generated/prisma/enums.js";

export class SavedPromptRepository {
  async create(data: {
    userId: string;
    name: string;
    promptBody: string;
    contentType: ContentType;
  }) {
    return prisma.savedPrompt.create({
      data,
    });
  }

  async findMany(userId: string) {
    return prisma.savedPrompt.findMany({
      where: { userId },

      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.savedPrompt.findFirst({
      where: { id, userId },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      promptBody?: string;
      contentType?: ContentType;
    }
  ) {
    return prisma.savedPrompt.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.savedPrompt.delete({
      where: { id },
    });
  }
}

export const savedPromptRepository = new SavedPromptRepository();

import { prisma } from "../lib/prisma.js";
import type { ContentType } from "../generated/prisma/enums.js";

export class PromptTemplateRepository {
  async findMany(filters: { category?: string; contentType?: ContentType }) {
    return prisma.promptTemplate.findMany({
      where: {
        category: filters.category,
        contentType: filters.contentType,
      },

      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }
}

export const promptTemplateRepository = new PromptTemplateRepository();

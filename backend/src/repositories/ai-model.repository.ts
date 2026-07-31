import { prisma } from "../lib/prisma.js";

export interface CreateAiModelData {
  providerId: string;
  modelKey: string;
  displayName: string;
  tags?: string[];
  contextWindow?: number | null;
  costPerInputToken?: number | null;
  costPerOutputToken?: number | null;
  isEnabled?: boolean;
}

export interface UpdateAiModelData {
  displayName?: string;
  tags?: string[];
  contextWindow?: number | null;
  costPerInputToken?: number | null;
  costPerOutputToken?: number | null;
  isEnabled?: boolean;
}

export class AiModelRepository {
  async create(data: CreateAiModelData) {
    return prisma.aiModel.create({ data });
  }

  async update(id: string, data: UpdateAiModelData) {
    return prisma.aiModel.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.aiModel.delete({ where: { id } });
  }

  async findById(id: string) {
    return prisma.aiModel.findUnique({ where: { id } });
  }

  async findAll() {
    return prisma.aiModel.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findByProvider(providerId: string) {
    return prisma.aiModel.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
    });
  }

  // Used by AiRoutingService's Dynamic Model Selection step (TDD §8) — the
  // Routing Engine filters a provider's enabled models by a routing policy's
  // requiredTag before falling back to the policy's literal preferredModelId.
  async findByProviderAndTag(providerId: string, tag: string) {
    return prisma.aiModel.findMany({
      where: { providerId, isEnabled: true, tags: { has: tag } },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const aiModelRepository = new AiModelRepository();

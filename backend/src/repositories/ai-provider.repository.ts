import { prisma } from "../lib/prisma.js";
import type { AiProviderKind, McpHealthStatus } from "../generated/prisma/enums.js";

export interface CreateAiProviderData {
  key: string;
  displayName: string;
  kind: AiProviderKind;
  baseUrl?: string | null;
  isEnabled?: boolean;
  rateLimitPerMinute?: number | null;
}

export interface UpdateAiProviderData {
  displayName?: string;
  baseUrl?: string | null;
  isEnabled?: boolean;
  rateLimitPerMinute?: number | null;
}

// Persistence only — provider plugin resolution lives in
// AiCoreProviderFactory, health evaluation lives in AiProviderHealthService.
export class AiProviderRepository {
  async create(data: CreateAiProviderData) {
    return prisma.aiProvider.create({ data });
  }

  async update(id: string, data: UpdateAiProviderData) {
    return prisma.aiProvider.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.aiProvider.delete({ where: { id } });
  }

  async findById(id: string) {
    return prisma.aiProvider.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return prisma.aiProvider.findUnique({ where: { key } });
  }

  async findAll() {
    return prisma.aiProvider.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findEnabled() {
    return prisma.aiProvider.findMany({
      where: { isEnabled: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateHealthStatus(id: string, healthStatus: McpHealthStatus, lastHealthMessage?: string | null) {
    return prisma.aiProvider.update({
      where: { id },
      data: {
        healthStatus,
        lastHealthMessage: lastHealthMessage ?? null,
        lastHealthCheckAt: new Date(),
      },
    });
  }
}

export const aiProviderRepository = new AiProviderRepository();

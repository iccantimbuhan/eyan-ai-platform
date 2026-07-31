import { prisma } from "../lib/prisma.js";

export interface CreateAiCapabilityData {
  key: string;
  name: string;
  description: string;
  brainId: string;
  isEnabled?: boolean;
}

export interface UpdateAiCapabilityData {
  name?: string;
  description?: string;
  brainId?: string;
  isEnabled?: boolean;
}

// The resolution surface every business-module invoke() call starts from —
// findByKeyWithBrain() is what AiCapabilityService.invoke() uses to resolve
// Capability -> Brain in one query (Phase 0.5 review Finding 1; TDD §8 step
// 0).
export class AiCapabilityRepository {
  async create(data: CreateAiCapabilityData) {
    return prisma.aiCapability.create({ data });
  }

  async update(id: string, data: UpdateAiCapabilityData) {
    return prisma.aiCapability.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.aiCapability.delete({ where: { id } });
  }

  async findById(id: string) {
    return prisma.aiCapability.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return prisma.aiCapability.findUnique({ where: { key } });
  }

  async findByKeyWithBrain(key: string) {
    return prisma.aiCapability.findUnique({
      where: { key },
      include: { brain: true },
    });
  }

  async findAll() {
    return prisma.aiCapability.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findByBrain(brainId: string) {
    return prisma.aiCapability.findMany({
      where: { brainId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const aiCapabilityRepository = new AiCapabilityRepository();

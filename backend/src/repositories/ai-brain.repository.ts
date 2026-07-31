import { prisma } from "../lib/prisma.js";
import type { AiMemoryStrategy } from "../generated/prisma/enums.js";

export interface CreateAiBrainData {
  key: string;
  name: string;
  description: string;
  category: string;
  memoryStrategy?: AiMemoryStrategy;
  isEnabled?: boolean;
  organizationId?: string | null;
}

export interface UpdateAiBrainData {
  name?: string;
  description?: string;
  category?: string;
  memoryStrategy?: AiMemoryStrategy;
  isEnabled?: boolean;
}

// Brain-direct invocation (administrative/Playground only, per the frozen
// architecture — see ADR-0021) is the one caller of findByKey outside CRUD;
// every business-module caller goes through AiCapabilityRepository instead.
export class AiBrainRepository {
  async create(data: CreateAiBrainData) {
    return prisma.aiBrain.create({ data });
  }

  async update(id: string, data: UpdateAiBrainData) {
    return prisma.aiBrain.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.aiBrain.delete({ where: { id } });
  }

  async findById(id: string) {
    return prisma.aiBrain.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return prisma.aiBrain.findUnique({ where: { key } });
  }

  async findAll() {
    return prisma.aiBrain.findMany({ orderBy: { createdAt: "desc" } });
  }
}

export const aiBrainRepository = new AiBrainRepository();

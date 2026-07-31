import { prisma } from "../lib/prisma.js";
import type { AiRoutingStrategy } from "../generated/prisma/enums.js";

export interface CreateAiRoutingPolicyData {
  brainId: string;
  strategy?: AiRoutingStrategy;
  requiredTag?: string | null;
  preferredProviderId: string;
  preferredModelId: string;
  fallbackProviderId?: string | null;
  fallbackModelId?: string | null;
  maxRetries?: number;
  timeoutMs?: number;
  confidenceHighThreshold?: number;
  confidenceMediumThreshold?: number;
}

// Same "additive rows, one active at a time, flip via transaction" posture
// as AiPromptRepository.
export class AiRoutingPolicyRepository {
  async create(data: CreateAiRoutingPolicyData) {
    return prisma.aiRoutingPolicy.create({ data });
  }

  async findById(id: string) {
    return prisma.aiRoutingPolicy.findUnique({
      where: { id },
      include: { preferredProvider: true, preferredModel: true, fallbackProvider: true, fallbackModel: true },
    });
  }

  async findActiveByBrain(brainId: string) {
    return prisma.aiRoutingPolicy.findFirst({
      where: { brainId, isActive: true },
      include: { preferredProvider: true, preferredModel: true, fallbackProvider: true, fallbackModel: true },
    });
  }

  async listByBrain(brainId: string) {
    return prisma.aiRoutingPolicy.findMany({
      where: { brainId },
      orderBy: { createdAt: "desc" },
    });
  }

  async activate(brainId: string, policyId: string) {
    return prisma.$transaction([
      prisma.aiRoutingPolicy.updateMany({ where: { brainId, isActive: true }, data: { isActive: false } }),
      prisma.aiRoutingPolicy.update({ where: { id: policyId }, data: { isActive: true } }),
    ]);
  }
}

export const aiRoutingPolicyRepository = new AiRoutingPolicyRepository();

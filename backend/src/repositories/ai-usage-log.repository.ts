import { prisma } from "../lib/prisma.js";
import type { AiCallOutcome } from "../generated/prisma/enums.js";

export interface CreateAiUsageLogData {
  brainId?: string | null;
  capabilityId?: string | null;
  providerId?: string | null;
  modelId?: string | null;
  workflowExecutionId?: string | null;
  domain?: string;
  outcome: AiCallOutcome;
  retryCount?: number;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costUsd?: number | null;
  latencyMs?: number | null;
  needsManualReview?: boolean;
  errorMessage?: string | null;
}

export interface PaginationOptions {
  skip: number;
  take: number;
}

// Fire-and-forget writes only, same posture as AnalyticsEventRepository —
// a telemetry-write failure must never fail a real AI call (AiUsageService
// enforces the try/catch around this; the repository itself stays a thin
// insert). domain defaults to "ai-core"; the Playground explicitly passes
// "ai-core-playground" (§13) so default listing/aggregation excludes it.
export class AiUsageLogRepository {
  async create(data: CreateAiUsageLogData) {
    return prisma.aiUsageLog.create({ data });
  }

  async findByDomain(domain: string, options: PaginationOptions) {
    return prisma.aiUsageLog.findMany({
      where: { domain },
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
      include: { brain: true, capability: true },
    });
  }

  async countByDomain(domain: string) {
    return prisma.aiUsageLog.count({ where: { domain } });
  }

  async aggregateCostByDomain(domain: string) {
    return prisma.aiUsageLog.aggregate({
      where: { domain },
      _sum: { costUsd: true, tokensIn: true, tokensOut: true },
      _count: { _all: true },
    });
  }
}

export const aiUsageLogRepository = new AiUsageLogRepository();

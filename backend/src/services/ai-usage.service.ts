import {
  aiUsageLogRepository,
  AiUsageLogRepository,
  type CreateAiUsageLogData,
} from "../repositories/ai-usage-log.repository.js";
import { logger } from "../lib/logger.js";

const PRODUCTION_DOMAIN = "ai-core";
const PLAYGROUND_DOMAIN = "ai-core-playground";
const MAX_PAGE_SIZE = 100;

// Fire-and-forget per-call telemetry (AnalyticsEvent's proven pattern) — a
// write failure here must never fail a real AI call, so every write is
// wrapped and logged, never thrown. record()/recordPlayground() force the
// domain themselves rather than trusting the caller, so production and
// Playground traffic can never cross-contaminate (Phase 0.5 Finding 5).
export class AiUsageService {
  constructor(private readonly repository: AiUsageLogRepository = aiUsageLogRepository) {}

  async record(data: CreateAiUsageLogData): Promise<void> {
    try {
      await this.repository.create({ ...data, domain: PRODUCTION_DOMAIN });
    } catch (error) {
      logger.error("[AiUsageService] Failed to write usage log.", error);
    }
  }

  async recordPlayground(data: CreateAiUsageLogData): Promise<void> {
    try {
      await this.repository.create({ ...data, domain: PLAYGROUND_DOMAIN });
    } catch (error) {
      logger.error("[AiUsageService] Failed to write playground usage log.", error);
    }
  }

  async listUsage(page = 1, pageSize = 20) {
    return this.paginatedList(PRODUCTION_DOMAIN, page, pageSize);
  }

  async listPlaygroundHistory(page = 1, pageSize = 20) {
    return this.paginatedList(PLAYGROUND_DOMAIN, page, pageSize);
  }

  async getCostSummary() {
    return this.repository.aggregateCostByDomain(PRODUCTION_DOMAIN);
  }

  private async paginatedList(domain: string, page: number, pageSize: number) {
    const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safePageSize;

    const [data, total] = await Promise.all([
      this.repository.findByDomain(domain, { skip, take: safePageSize }),
      this.repository.countByDomain(domain),
    ]);

    return { data, total, page: safePage, pageSize: safePageSize };
  }
}

export const aiUsageService = new AiUsageService();

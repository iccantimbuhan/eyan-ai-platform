import {
  financeBudgetRepository,
  FinanceBudgetRepository,
} from "../repositories/finance-budget.repository.js";
import { financeAuditService, FinanceAuditService } from "./finance-audit.service.js";
import { BudgetNotConfiguredError } from "../errors/finance.error.js";
import type { SetBudgetDto } from "../dto/finance-budget.dto.js";
import { mapBudgetToResponse } from "../dto/finance-budget.mapper.js";
import { currentPeriod } from "../utils/finance-period.js";
import { logger } from "../lib/logger.js";

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class FinanceBudgetService {
  constructor(
    private readonly repository: FinanceBudgetRepository = financeBudgetRepository,
    private readonly auditService: FinanceAuditService = financeAuditService
  ) {}

  // Lazily carries the previous period's limit forward when the current
  // period has no Budget row yet — same lazy-on-access philosophy as
  // FinanceGenerationService, applied to a much cheaper operation. Throws
  // only on the very first-ever run, when there is no prior Budget at all.
  async getOrCreateForPeriod(period: string = currentPeriod()) {
    const raw = await this.getOrCreateForPeriodRaw(period);
    return mapBudgetToResponse(raw);
  }

  // Raw (Decimal, not string) variant for FinanceDashboardService's
  // remaining-budget arithmetic — Decimal subtraction must never round-trip
  // through a formatted string.
  async getOrCreateForPeriodRaw(period: string = currentPeriod()) {
    const existing = await this.repository.findByPeriod(period);

    if (existing) {
      return existing;
    }

    const previous = await this.repository.findMostRecentBefore(period);

    if (!previous) {
      throw new BudgetNotConfiguredError();
    }

    return this.repository.create({
      period,
      monthlyLimit: previous.monthlyLimit,
    });
  }

  async setBudget(data: SetBudgetDto, actorId: string) {
    const budget = await this.repository.upsertByPeriod({
      period: data.period,
      monthlyLimit: data.monthlyLimit,
      actorId,
    });

    // Fire-and-forget: the audit trail must never block the request path.
    // See ContentService.generate()'s identical posture.
    void this.auditService
      .record({
        actorId,
        action: "BUDGET_SET",
        targetType: "Budget",
        targetId: budget.id,
        metadata: { period: data.period, monthlyLimit: data.monthlyLimit },
      })
      .catch((error) =>
        logger.error(
          `[FinanceBudgetService] Failed to record audit event for ${budget.id}: ${errorMessageOf(error)}`
        )
      );

    return mapBudgetToResponse(budget);
  }
}

export const financeBudgetService = new FinanceBudgetService();

import { Prisma } from "../generated/prisma/client.js";
import {
  financeExpenseRepository,
  FinanceExpenseRepository,
} from "../repositories/finance-expense.repository.js";
import { financeBudgetService, FinanceBudgetService } from "./finance-budget.service.js";
import {
  financeGenerationService,
  FinanceGenerationService,
} from "./finance-generation.service.js";
import { BudgetNotConfiguredError } from "../errors/finance.error.js";
import { mapBudgetToResponse } from "../dto/finance-budget.mapper.js";
import { mapExpenseToResponse } from "../dto/finance-expense.mapper.js";
import type { FinanceDashboardResponseDto } from "../dto/finance-dashboard.dto.js";
import {
  currentPeriod,
  periodEnd,
  periodStart,
  trailingPeriods,
} from "../utils/finance-period.js";

const RECENT_EXPENSES_LIMIT = 5;
const TREND_MONTHS = 6;

export class FinanceDashboardService {
  constructor(
    private readonly expenseRepository: FinanceExpenseRepository = financeExpenseRepository,
    private readonly budgetService: FinanceBudgetService = financeBudgetService,
    private readonly generationService: FinanceGenerationService = financeGenerationService
  ) {}

  async getDashboard(period: string = currentPeriod()): Promise<FinanceDashboardResponseDto> {
    await this.generationService.ensureCurrentPeriodGenerated(period);

    const dateFrom = periodStart(period);
    const dateTo = periodEnd(period);

    const [budgetRaw, sum, groupedByCategory, recent, spendingTrend] = await Promise.all([
      this.resolveBudget(period),
      this.expenseRepository.sumForPeriod(dateFrom, dateTo),
      this.expenseRepository.groupByCategoryForPeriod(dateFrom, dateTo),
      this.expenseRepository.findRecent(RECENT_EXPENSES_LIMIT),
      this.getSpendingTrend(period),
    ]);

    const totalExpenses = sum._sum.amount ?? new Prisma.Decimal(0);

    // Decimal subtraction, never JS float — see FinanceBudgetService's raw
    // (non-string) accessor.
    const remainingBudget = budgetRaw
      ? budgetRaw.monthlyLimit.minus(totalExpenses)
      : null;

    return {
      period,
      budget: budgetRaw ? mapBudgetToResponse(budgetRaw) : null,
      totalExpenses: totalExpenses.toFixed(2),
      remainingBudget: remainingBudget ? remainingBudget.toFixed(2) : null,
      categoryBreakdown: groupedByCategory.map((row) => ({
        category: row.category,
        total: (row._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      })),
      spendingTrend,
      recentExpenses: recent.map(mapExpenseToResponse),
    };
  }

  // Small, bounded N (6 months) — a Promise.all of per-month aggregate()
  // calls stays within this codebase's existing Prisma fluent-API
  // precedent, avoiding the first raw-SQL/date_trunc usage for a widget
  // that doesn't need it. Same reasoning as the Reports phase's spending
  // trend endpoint (see TDD §17).
  private async getSpendingTrend(period: string) {
    const periods = trailingPeriods(period, TREND_MONTHS);

    const sums = await Promise.all(
      periods.map((trendPeriod) =>
        this.expenseRepository.sumForPeriod(periodStart(trendPeriod), periodEnd(trendPeriod))
      )
    );

    return periods.map((trendPeriod, index) => ({
      period: trendPeriod,
      total: (sums[index]._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    }));
  }

  private async resolveBudget(period: string) {
    try {
      return await this.budgetService.getOrCreateForPeriodRaw(period);
    } catch (error) {
      if (error instanceof BudgetNotConfiguredError) {
        return null;
      }
      throw error;
    }
  }
}

export const financeDashboardService = new FinanceDashboardService();

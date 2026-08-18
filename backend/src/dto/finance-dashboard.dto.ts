import type { ExpenseCategory } from "../generated/prisma/enums.js";
import type { BudgetResponseDto } from "./finance-budget.dto.js";
import type { ExpenseResponseDto } from "./finance-expense.dto.js";

export interface CategoryBreakdownDto {
  category: ExpenseCategory;
  total: string;
}

export interface SpendingTrendPointDto {
  period: string;
  total: string;
}

export interface CategoryRankingDto {
  category: ExpenseCategory;
  total: string;
  rank: number;
}

export interface CategoryPercentageDto {
  category: ExpenseCategory;
  total: string;
  // null whenever the denominator is unavailable (no budget configured, or
  // zero total spending) -- never substituted with a different denominator.
  percentageOfTotalSpending: string | null;
  percentageOfBudget: string | null;
}

export interface FinanceFactsDto {
  hasBudget: boolean;
  categoryRanking: CategoryRankingDto[];
  categoryPercentages: CategoryPercentageDto[];
  // No per-category spending limit concept exists in the Budget model today
  // (see schema.prisma -- Budget has a single monthlyLimit per period, no
  // per-category relation). Always false; present explicitly so callers have
  // a real field to check instead of inventing a threshold.
  hasCategorySpecificThresholds: false;
}

export interface FinanceDashboardResponseDto {
  period: string;
  budget: BudgetResponseDto | null;
  totalExpenses: string;
  remainingBudget: string | null;
  categoryBreakdown: CategoryBreakdownDto[];
  spendingTrend: SpendingTrendPointDto[];
  recentExpenses: ExpenseResponseDto[];
  financeFacts: FinanceFactsDto;
}

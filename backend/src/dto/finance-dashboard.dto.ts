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

export interface FinanceDashboardResponseDto {
  period: string;
  budget: BudgetResponseDto | null;
  totalExpenses: string;
  remainingBudget: string | null;
  categoryBreakdown: CategoryBreakdownDto[];
  spendingTrend: SpendingTrendPointDto[];
  recentExpenses: ExpenseResponseDto[];
}

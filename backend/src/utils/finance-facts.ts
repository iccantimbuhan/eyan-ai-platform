import { Prisma } from "../generated/prisma/client.js";
import type { ExpenseCategory } from "../generated/prisma/enums.js";
import type { FinanceFactsDto } from "../dto/finance-dashboard.dto.js";

const PERCENTAGE_DECIMAL_PLACES = 1;

export interface CategoryTotal {
  category: ExpenseCategory;
  total: Prisma.Decimal;
}

// null whenever the denominator is unavailable -- never substitutes a
// different denominator (see GET_FINANCE_QUESTION T5/T2 regression: the LLM
// was performing this division itself and occasionally chose or computed
// against the wrong operand; this is now the single place division happens).
function percentageOf(
  numerator: Prisma.Decimal,
  denominator: Prisma.Decimal | null
): string | null {
  if (!denominator || denominator.isZero()) return null;
  return numerator.dividedBy(denominator).times(100).toFixed(PERCENTAGE_DECIMAL_PLACES);
}

export function buildFinanceFacts(
  totalExpenses: Prisma.Decimal,
  monthlyLimit: Prisma.Decimal | null,
  categoryTotals: CategoryTotal[]
): FinanceFactsDto {
  const ranked = [...categoryTotals].sort((a, b) => b.total.comparedTo(a.total));

  return {
    hasBudget: monthlyLimit !== null,
    categoryRanking: ranked.map((entry, index) => ({
      category: entry.category,
      total: entry.total.toFixed(2),
      rank: index + 1,
    })),
    categoryPercentages: categoryTotals.map((entry) => ({
      category: entry.category,
      total: entry.total.toFixed(2),
      percentageOfTotalSpending: percentageOf(entry.total, totalExpenses),
      percentageOfBudget: percentageOf(entry.total, monthlyLimit),
    })),
    hasCategorySpecificThresholds: false,
  };
}

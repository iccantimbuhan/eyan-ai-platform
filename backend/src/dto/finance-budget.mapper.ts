import type { Budget } from "../generated/prisma/client.js";
import type { BudgetResponseDto } from "./finance-budget.dto.js";

export function mapBudgetToResponse(row: Budget): BudgetResponseDto {
  return {
    id: row.id,
    period: row.period,
    monthlyLimit: row.monthlyLimit.toFixed(2),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

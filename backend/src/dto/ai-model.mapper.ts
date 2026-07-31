import type { AiModel } from "../generated/prisma/client.js";
import type { AiModelResponseDto } from "./ai-model.dto.js";

// costPerInputToken/costPerOutputToken are Decimal(12,8) — converted to a
// string at this boundary (not toFixed(2), unlike Expense.amount — per-token
// costs are fractions of a cent and need the full precision, not currency
// rounding).
export function mapAiModelToResponse(row: AiModel): AiModelResponseDto {
  return {
    id: row.id,
    providerId: row.providerId,
    modelKey: row.modelKey,
    displayName: row.displayName,
    tags: row.tags,
    contextWindow: row.contextWindow,
    costPerInputToken: row.costPerInputToken?.toString() ?? null,
    costPerOutputToken: row.costPerOutputToken?.toString() ?? null,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

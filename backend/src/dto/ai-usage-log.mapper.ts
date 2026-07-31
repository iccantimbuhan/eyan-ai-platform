import type { AiUsageLog } from "../generated/prisma/client.js";
import type { AiUsageLogResponseDto } from "./ai-usage-log.dto.js";

export function mapAiUsageLogToResponse(row: AiUsageLog): AiUsageLogResponseDto {
  return {
    id: row.id,
    brainId: row.brainId,
    capabilityId: row.capabilityId,
    providerId: row.providerId,
    modelId: row.modelId,
    workflowExecutionId: row.workflowExecutionId,
    domain: row.domain,
    outcome: row.outcome,
    retryCount: row.retryCount,
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    costUsd: row.costUsd?.toString() ?? null,
    latencyMs: row.latencyMs,
    needsManualReview: row.needsManualReview,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
  };
}

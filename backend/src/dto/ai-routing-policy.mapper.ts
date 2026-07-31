import type { AiRoutingPolicy } from "../generated/prisma/client.js";
import type { AiRoutingPolicyResponseDto } from "./ai-routing-policy.dto.js";

export function mapAiRoutingPolicyToResponse(row: AiRoutingPolicy): AiRoutingPolicyResponseDto {
  return {
    id: row.id,
    brainId: row.brainId,
    isActive: row.isActive,
    strategy: row.strategy,
    requiredTag: row.requiredTag,
    preferredProviderId: row.preferredProviderId,
    preferredModelId: row.preferredModelId,
    fallbackProviderId: row.fallbackProviderId,
    fallbackModelId: row.fallbackModelId,
    maxRetries: row.maxRetries,
    timeoutMs: row.timeoutMs,
    confidenceHighThreshold: row.confidenceHighThreshold,
    confidenceMediumThreshold: row.confidenceMediumThreshold,
    createdAt: row.createdAt,
  };
}

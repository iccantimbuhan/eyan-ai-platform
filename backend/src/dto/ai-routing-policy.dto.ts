import type { AiRoutingStrategy } from "../generated/prisma/enums.js";

export interface AiRoutingPolicyResponseDto {
  id: string;
  brainId: string;
  isActive: boolean;
  strategy: AiRoutingStrategy;
  requiredTag: string | null;
  preferredProviderId: string;
  preferredModelId: string;
  fallbackProviderId: string | null;
  fallbackModelId: string | null;
  maxRetries: number;
  timeoutMs: number;
  confidenceHighThreshold: number;
  confidenceMediumThreshold: number;
  createdAt: Date;
}

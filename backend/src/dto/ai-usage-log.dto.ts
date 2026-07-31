import type { AiCallOutcome } from "../generated/prisma/enums.js";

export interface AiUsageLogResponseDto {
  id: string;
  brainId: string | null;
  capabilityId: string | null;
  providerId: string | null;
  modelId: string | null;
  workflowExecutionId: string | null;
  domain: string;
  outcome: AiCallOutcome;
  retryCount: number;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: string | null;
  latencyMs: number | null;
  needsManualReview: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

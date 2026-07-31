import type { AiEvaluation } from "../generated/prisma/client.js";
import type { AiEvaluationResponseDto } from "./ai-evaluation.dto.js";

export function mapAiEvaluationToResponse(row: AiEvaluation): AiEvaluationResponseDto {
  return {
    id: row.id,
    promptId: row.promptId,
    testCaseName: row.testCaseName,
    input: row.input as Record<string, unknown>,
    expectedShape: (row.expectedShape as Record<string, unknown> | null) ?? null,
    actualOutput: (row.actualOutput as Record<string, unknown> | null) ?? null,
    passed: row.passed,
    score: row.score,
    evaluatedAt: row.evaluatedAt,
  };
}

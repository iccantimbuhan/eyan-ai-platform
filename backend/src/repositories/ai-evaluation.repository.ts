import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateAiEvaluationData {
  promptId: string;
  testCaseName: string;
  input: Record<string, unknown>;
  expectedShape?: Record<string, unknown> | null;
  actualOutput?: Record<string, unknown> | null;
  passed: boolean;
  score?: number | null;
}

export class AiEvaluationRepository {
  async create(data: CreateAiEvaluationData) {
    return prisma.aiEvaluation.create({
      data: {
        ...data,
        input: data.input as Prisma.InputJsonValue,
        expectedShape: data.expectedShape as Prisma.InputJsonValue | undefined,
        actualOutput: data.actualOutput as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listByPrompt(promptId: string) {
    return prisma.aiEvaluation.findMany({
      where: { promptId },
      orderBy: { evaluatedAt: "desc" },
    });
  }
}

export const aiEvaluationRepository = new AiEvaluationRepository();

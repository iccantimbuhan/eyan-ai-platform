import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export class VideoWorkflowPlanRepository {
  async create(data: {
    projectId: string;
    videoAssetId: string;
    prompt: string;
    workflow: Prisma.InputJsonValue;
    model?: string | null;
    createdBy?: string | null;
  }) {
    return prisma.videoWorkflowPlan.create({
      data,
    });
  }

  async findById(id: string, userId: string) {
    return prisma.videoWorkflowPlan.findFirst({
      where: { id, project: { userId } },
    });
  }

  async findManyByProject(projectId: string, userId: string) {
    return prisma.videoWorkflowPlan.findMany({
      where: { projectId, project: { userId } },
      orderBy: { createdAt: "desc" },
    });
  }

  // Sprint 7.2.3 — called once by VideoExecutionEngineService after a
  // successful run. Last-write-wins if a plan is ever executed more than
  // once; no idempotency guard was asked for or built this milestone.
  async markExecuted(id: string, resultVideoAssetId: string) {
    return prisma.videoWorkflowPlan.update({
      where: { id },
      data: { resultVideoAssetId, executedAt: new Date() },
    });
  }
}

export const videoWorkflowPlanRepository = new VideoWorkflowPlanRepository();

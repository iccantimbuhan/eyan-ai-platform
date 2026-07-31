import { prisma } from "../lib/prisma.js";
import type { WorkflowExecutionStatus } from "../generated/prisma/enums.js";

export interface CreateWorkflowExecutionLogData {
  domain: string;
  workflowName: string;
  leadId?: string | null;
  n8nExecutionId: string;
  status: WorkflowExecutionStatus;
  durationMs?: number | null;
  errorMessage?: string | null;
}

export interface UpdateWorkflowExecutionLogData {
  status: WorkflowExecutionStatus;
  durationMs?: number | null;
  errorMessage?: string | null;
}

export class WorkflowExecutionLogRepository {
  // No unique DB constraint backs this lookup (ADR-0019 Decision 5) — a
  // single sequential n8n caller doesn't create the write-write race a
  // constraint would defend against; revisit only if that changes.
  async findByExecutionId(workflowName: string, n8nExecutionId: string) {
    return prisma.workflowExecutionLog.findFirst({
      where: { workflowName, n8nExecutionId },
    });
  }

  async create(data: CreateWorkflowExecutionLogData) {
    return prisma.workflowExecutionLog.create({ data });
  }

  async update(id: string, data: UpdateWorkflowExecutionLogData) {
    return prisma.workflowExecutionLog.update({ where: { id }, data });
  }
}

export const workflowExecutionLogRepository = new WorkflowExecutionLogRepository();

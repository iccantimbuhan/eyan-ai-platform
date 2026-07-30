import { prisma } from "../lib/prisma.js";
import type { FinanceAuditAction } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateFinanceAuditEventData {
  actorId: string;
  action: FinanceAuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

// Append-only, same posture as AutomationAuditEventRepository — there is no
// update()/delete(): audit rows are never modified after being written.
export class FinanceAuditEventRepository {
  async create(data: CreateFinanceAuditEventData) {
    return prisma.financeAuditEvent.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

export const financeAuditEventRepository = new FinanceAuditEventRepository();

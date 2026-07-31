import { prisma } from "../lib/prisma.js";
import type { AiAuditAction } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateAiAuditEventData {
  actorId?: string | null;
  action: AiAuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

export interface PaginationOptions {
  skip: number;
  take: number;
}

// Append-only — mirrors AutomationAuditEventRepository exactly (no update()
// or delete()).
export class AiAuditEventRepository {
  async create(data: CreateAiAuditEventData) {
    return prisma.aiAuditEvent.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findByTarget(targetType: string, targetId: string, options: PaginationOptions) {
    return prisma.aiAuditEvent.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    });
  }

  async findRecent(options: PaginationOptions) {
    return prisma.aiAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    });
  }

  async countByTarget(targetType: string, targetId: string) {
    return prisma.aiAuditEvent.count({ where: { targetType, targetId } });
  }

  async count() {
    return prisma.aiAuditEvent.count();
  }
}

export const aiAuditEventRepository = new AiAuditEventRepository();

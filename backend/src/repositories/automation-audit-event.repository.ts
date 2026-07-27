import { prisma } from "../lib/prisma.js";
import type { AutomationAuditAction } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateAutomationAuditEventData {
  actorId: string;
  action: AutomationAuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

export interface PaginationOptions {
  skip: number;
  take: number;
}

// Append-only, same posture as AnalyticsEventRepository/AssetReviewEvent —
// there is no update() or delete(): audit rows are never modified after
// being written. Every list method takes explicit skip/take rather than
// returning everything, and has a matching count() so a future paginated
// API response (ApiResponse.paginated) can compute totalPages without a
// second, redundant query shape.
export class AutomationAuditEventRepository {
  async create(data: CreateAutomationAuditEventData) {
    return prisma.automationAuditEvent.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findByConnection(connectionId: string, options: PaginationOptions) {
    return this.findByTarget("AutomationConnection", connectionId, options);
  }

  async findByTarget(
    targetType: string,
    targetId: string,
    options: PaginationOptions
  ) {
    return prisma.automationAuditEvent.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    });
  }

  async findByUser(userId: string, options: PaginationOptions) {
    return prisma.automationAuditEvent.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    });
  }

  async findRecent(options: PaginationOptions) {
    return prisma.automationAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    });
  }

  async countByTarget(targetType: string, targetId: string) {
    return prisma.automationAuditEvent.count({
      where: { targetType, targetId },
    });
  }

  async countByUser(userId: string) {
    return prisma.automationAuditEvent.count({
      where: { actorId: userId },
    });
  }

  async count() {
    return prisma.automationAuditEvent.count();
  }
}

export const automationAuditEventRepository = new AutomationAuditEventRepository();

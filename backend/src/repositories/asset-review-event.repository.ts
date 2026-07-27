import { prisma } from "../lib/prisma.js";
import type { AssetType, ReviewEventType, ReviewStatus } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateReviewEventData {
  projectId: string;
  assetType: AssetType;
  sourceId: string;
  type: ReviewEventType;
  actorId: string;
  fromStatus?: ReviewStatus | null;
  toStatus?: ReviewStatus | null;
  metadata?: Record<string, unknown> | null;
}

// Append-only activity log — one row per review-relevant action. Never
// updated or deleted except cascade on project delete. See ADR-0009.
export class AssetReviewEventRepository {
  async create(data: CreateReviewEventData) {
    return prisma.assetReviewEvent.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findManyBySource(assetType: AssetType, sourceId: string) {
    return prisma.assetReviewEvent.findMany({
      where: { assetType, sourceId },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  }

  // Sprint 6.5 (Analytics Foundation) — the project-wide activity feed and
  // review-performance computation both need every review event for a
  // project, not one asset's — this table's existing @@index([projectId])/
  // @@index([createdAt]) already support it efficiently.
  async findManyByProject(projectId: string) {
    return prisma.assetReviewEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  }

  // Sprint 6.6 (Production Dashboard) — the platform-wide activity feed
  // needs every review event across every project a user owns.
  async findManyByProjectIds(projectIds: string[]) {
    if (projectIds.length === 0) {
      return [];
    }

    return prisma.assetReviewEvent.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  }
}

export const assetReviewEventRepository = new AssetReviewEventRepository();

import { prisma } from "../lib/prisma.js";
import type { AssetType } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateAnalyticsEventData {
  projectId: string;
  assetType: AssetType;
  sourceId: string;
  type: "GENERATED";
  actorId: string;
  provider?: string | null;
  model?: string | null;
  generationTimeMs?: number | null;
  brandKitId?: string | null;
  metadata?: Record<string, unknown> | null;
}

// Append-only, one row per first-time generation — the one genuine gap
// existing data doesn't cover (AssetReviewEvent is scoped to review-
// relevant activity by ADR-0009 and is never entered until an asset is
// touched by the QA workflow). See ADR-0011.
export class AnalyticsEventRepository {
  async create(data: CreateAnalyticsEventData) {
    return prisma.analyticsEvent.create({
      data: {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findManyByProject(projectId: string) {
    return prisma.analyticsEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  }

  // Sprint 6.6 (Production Dashboard) — the platform-wide activity feed
  // needs every generation event across every project a user owns, not one
  // project's — projectId is already indexed, so this is an efficient IN
  // query, not a new scale concern.
  async findManyByProjectIds(projectIds: string[]) {
    if (projectIds.length === 0) {
      return [];
    }

    return prisma.analyticsEvent.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  }

  async groupByAssetType(projectId?: string) {
    return prisma.analyticsEvent.groupBy({
      by: ["assetType"],
      where: projectId ? { projectId } : undefined,
      _count: { _all: true },
      _avg: { generationTimeMs: true },
    });
  }

  async groupByProvider(projectId?: string) {
    return prisma.analyticsEvent.groupBy({
      by: ["provider"],
      where: { provider: { not: null }, ...(projectId ? { projectId } : {}) },
      _count: { _all: true },
      _avg: { generationTimeMs: true },
    });
  }

  async groupByBrandKit(projectId: string) {
    return prisma.analyticsEvent.groupBy({
      by: ["brandKitId"],
      where: { projectId, brandKitId: { not: null } },
      _count: { _all: true },
    });
  }
}

export const analyticsEventRepository = new AnalyticsEventRepository();

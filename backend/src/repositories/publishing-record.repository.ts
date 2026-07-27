import { prisma } from "../lib/prisma.js";
import type { AssetType, PublishingStatus } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface UpsertPublishingRecordData {
  createdById: string;
  status: PublishingStatus;
  scheduledFor?: Date | null;
}

export interface MarkPublishingRecordData {
  status: PublishingStatus;
  publishedAt?: Date | null;
  externalId?: string | null;
  externalUrl?: string | null;
  errorMessage?: string | null;
  attempts?: number;
}

// One row per (assetType, sourceId, platform) — upsert-style like
// AssetReviewAssignment, not append-only itself. History of what happened
// lives in AssetReviewEvent, reused rather than duplicated here. See
// ADR-0010.
export class PublishingRecordRepository {
  async upsert(
    assetType: AssetType,
    sourceId: string,
    projectId: string,
    platform: string,
    data: UpsertPublishingRecordData
  ) {
    return prisma.publishingRecord.upsert({
      where: { assetType_sourceId_platform: { assetType, sourceId, platform } },
      create: {
        assetType,
        sourceId,
        projectId,
        platform,
        status: data.status,
        scheduledFor: data.scheduledFor,
        createdById: data.createdById,
      },
      update: {
        status: data.status,
        scheduledFor: data.scheduledFor,
      },
    });
  }

  async update(id: string, data: MarkPublishingRecordData) {
    return prisma.publishingRecord.update({
      where: { id },
      data,
    });
  }

  async findOne(assetType: AssetType, sourceId: string, platform: string) {
    return prisma.publishingRecord.findUnique({
      where: { assetType_sourceId_platform: { assetType, sourceId, platform } },
    });
  }

  async findManyBySource(assetType: AssetType, sourceId: string) {
    return prisma.publishingRecord.findMany({
      where: { assetType, sourceId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findManyBySourceIds(
    pairs: { assetType: AssetType; sourceId: string }[]
  ) {
    if (pairs.length === 0) {
      return [];
    }

    return prisma.publishingRecord.findMany({
      where: {
        OR: pairs.map((pair) => ({
          assetType: pair.assetType,
          sourceId: pair.sourceId,
        })),
      },
    });
  }

  // Sprint 6.5 (Analytics Foundation) — publishing-status counts for a
  // project, grouped in the service layer like everything else in this
  // aggregation area (ADR-0008).
  async findManyByProject(projectId: string) {
    return prisma.publishingRecord.findMany({
      where: { projectId },
    });
  }
}

export const publishingRecordRepository = new PublishingRecordRepository();

export type PublishingRecordRow = Prisma.PublishingRecordGetPayload<object>;

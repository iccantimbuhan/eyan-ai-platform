import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { AssetType, ReviewStatus } from "../generated/prisma/enums.js";
import type { ChecklistItemValue } from "../dto/asset.dto.js";

export interface AssetReviewUpsertData {
  status?: ReviewStatus;
  reviewerId?: string | null;
  reviewedAt?: Date | null;
  notes?: string | null;
  qaScore?: number | null;
  // Never explicitly cleared to null in this sprint (a review submission
  // always replaces the checklist wholesale) — omitted entirely means
  // "leave the persisted checklist as-is".
  checklist?: ChecklistItemValue[];
}

// One row per asset that has ever been touched by QA — an asset with no row
// here is implicitly ReviewStatus.DRAFT (AssetService applies that default;
// this repository only ever reflects what's actually persisted).
export class AssetReviewRepository {
  async findManyBySourceIds(
    pairs: { assetType: AssetType; sourceId: string }[]
  ) {
    if (pairs.length === 0) {
      return [];
    }

    return prisma.assetReview.findMany({
      where: {
        OR: pairs.map((pair) => ({
          assetType: pair.assetType,
          sourceId: pair.sourceId,
        })),
      },
    });
  }

  // Includes the reviewer relation (name) — only ever called for a single
  // asset's detail view, where showing "reviewed by X" is worth the join;
  // findManyBySourceIds() (used for list views) deliberately doesn't.
  async findOne(assetType: AssetType, sourceId: string) {
    return prisma.assetReview.findUnique({
      where: { assetType_sourceId: { assetType, sourceId } },
      include: { reviewer: true },
    });
  }

  async upsert(
    assetType: AssetType,
    sourceId: string,
    projectId: string,
    data: AssetReviewUpsertData
  ) {
    return prisma.assetReview.upsert({
      where: { assetType_sourceId: { assetType, sourceId } },
      create: {
        assetType,
        sourceId,
        projectId,
        status: data.status ?? "DRAFT",
        reviewerId: data.reviewerId,
        reviewedAt: data.reviewedAt,
        notes: data.notes,
        qaScore: data.qaScore,
        checklist: toJsonInput(data.checklist),
      },
      update: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.reviewerId !== undefined
          ? { reviewerId: data.reviewerId }
          : {}),
        ...(data.reviewedAt !== undefined
          ? { reviewedAt: data.reviewedAt }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.qaScore !== undefined ? { qaScore: data.qaScore } : {}),
        ...(data.checklist !== undefined
          ? { checklist: toJsonInput(data.checklist) }
          : {}),
      },
    });
  }

  // deleteMany (not delete): an asset that was never reviewed has no row to
  // remove, and that must be a no-op, not a thrown error — matches the
  // lazy-creation philosophy this table is built around.
  async deleteBySource(assetType: AssetType, sourceId: string) {
    return prisma.assetReview.deleteMany({
      where: { assetType, sourceId },
    });
  }
}

function toJsonInput(
  checklist: ChecklistItemValue[] | undefined
): Prisma.InputJsonValue | undefined {
  return checklist === undefined
    ? undefined
    : (checklist as unknown as Prisma.InputJsonValue);
}

export const assetReviewRepository = new AssetReviewRepository();

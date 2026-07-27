import { prisma } from "../lib/prisma.js";
import type { AssetType } from "../generated/prisma/enums.js";

export interface CreateAssetCommentData {
  projectId: string;
  assetType: AssetType;
  sourceId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  regionX?: number;
  regionY?: number;
  regionWidth?: number;
  regionHeight?: number;
  timestampMs?: number;
}

// General comments and annotations for an asset, keyed on (assetType,
// sourceId) exactly like AssetReview/AssetVersion. An annotation is just a
// comment with an anchor (region* or timestampMs) set — see AssetComment in
// schema.prisma.
export class AssetCommentRepository {
  async create(data: CreateAssetCommentData) {
    return prisma.assetComment.create({ data });
  }

  async findManyBySource(assetType: AssetType, sourceId: string) {
    return prisma.assetComment.findMany({
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

    return prisma.assetComment.findMany({
      where: {
        OR: pairs.map((pair) => ({
          assetType: pair.assetType,
          sourceId: pair.sourceId,
        })),
      },
    });
  }

  async resolve(id: string, resolvedBy: string) {
    return prisma.assetComment.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedBy },
    });
  }

  async findById(id: string) {
    return prisma.assetComment.findUnique({ where: { id } });
  }

  // deleteMany (not delete): matches AssetReviewRepository.deleteBySource's
  // no-op-safe pattern — deleting an id that's already gone must not throw.
  async delete(id: string) {
    return prisma.assetComment.deleteMany({ where: { id } });
  }
}

export const assetCommentRepository = new AssetCommentRepository();

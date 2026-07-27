import { prisma } from "../lib/prisma.js";
import type { AssetType } from "../generated/prisma/enums.js";

export interface AssignReviewerData {
  assigneeId: string;
  assignedById: string;
  note?: string | null;
}

// Informational-only reviewer assignment, one active row per (assetType,
// sourceId) — assigning again replaces the previous assignee. Does not
// grant the assignee any access; ContentProject stays single-owner
// (ADR-0007). See ADR-0009.
export class AssetReviewAssignmentRepository {
  async upsert(
    assetType: AssetType,
    sourceId: string,
    projectId: string,
    data: AssignReviewerData
  ) {
    return prisma.assetReviewAssignment.upsert({
      where: { assetType_sourceId: { assetType, sourceId } },
      create: {
        assetType,
        sourceId,
        projectId,
        assigneeId: data.assigneeId,
        assignedById: data.assignedById,
        note: data.note,
      },
      update: {
        assigneeId: data.assigneeId,
        assignedById: data.assignedById,
        note: data.note,
      },
    });
  }

  async findOne(assetType: AssetType, sourceId: string) {
    return prisma.assetReviewAssignment.findUnique({
      where: { assetType_sourceId: { assetType, sourceId } },
      include: { assignee: true },
    });
  }

  async findManyBySourceIds(
    pairs: { assetType: AssetType; sourceId: string }[]
  ) {
    if (pairs.length === 0) {
      return [];
    }

    return prisma.assetReviewAssignment.findMany({
      where: {
        OR: pairs.map((pair) => ({
          assetType: pair.assetType,
          sourceId: pair.sourceId,
        })),
      },
      include: { assignee: true },
    });
  }

  // deleteMany (not delete): an asset with no assignment has no row to
  // remove, matching AssetReviewRepository.deleteBySource's no-op-safe
  // pattern.
  async delete(assetType: AssetType, sourceId: string) {
    return prisma.assetReviewAssignment.deleteMany({
      where: { assetType, sourceId },
    });
  }
}

export const assetReviewAssignmentRepository =
  new AssetReviewAssignmentRepository();

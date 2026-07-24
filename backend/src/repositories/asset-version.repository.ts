import { prisma } from "../lib/prisma.js";
import type { AssetType } from "../generated/prisma/enums.js";

// One row per generated version of an asset. An asset with no row here is
// implicitly version 1 (AssetService applies that default) — a row is only
// ever created when an asset is actually regenerated.
export class AssetVersionRepository {
  async findOne(assetType: AssetType, sourceId: string) {
    return prisma.assetVersion.findUnique({
      where: { assetType_sourceId: { assetType, sourceId } },
    });
  }

  async findManyBySourceIds(
    pairs: { assetType: AssetType; sourceId: string }[]
  ) {
    if (pairs.length === 0) {
      return [];
    }

    return prisma.assetVersion.findMany({
      where: {
        OR: pairs.map((pair) => ({
          assetType: pair.assetType,
          sourceId: pair.sourceId,
        })),
      },
    });
  }

  async findLineage(lineageId: string) {
    return prisma.assetVersion.findMany({
      where: { lineageId },
      orderBy: { versionNumber: "asc" },
    });
  }

  // Lazily backfills version 1 for a source that predates any regeneration.
  // lineageId can't be set to the row's own id in a single insert (the id
  // isn't known until the row exists), so this is a create-then-update —
  // the same two-step shape ImageService.generate() already uses for
  // PENDING -> COMPLETED.
  async createFirstVersion(
    assetType: AssetType,
    sourceId: string,
    projectId: string
  ) {
    const created = await prisma.assetVersion.create({
      data: {
        assetType,
        sourceId,
        projectId,
        lineageId: "",
        versionNumber: 1,
      },
    });

    return prisma.assetVersion.update({
      where: { id: created.id },
      data: { lineageId: created.id },
    });
  }

  async createNextVersion(
    assetType: AssetType,
    newSourceId: string,
    projectId: string,
    previous: { id: string; lineageId: string; versionNumber: number }
  ) {
    return prisma.assetVersion.create({
      data: {
        assetType,
        sourceId: newSourceId,
        projectId,
        lineageId: previous.lineageId,
        versionNumber: previous.versionNumber + 1,
        previousVersionId: previous.id,
      },
    });
  }
}

export const assetVersionRepository = new AssetVersionRepository();

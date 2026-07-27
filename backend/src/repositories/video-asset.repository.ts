import { prisma } from "../lib/prisma.js";
import type {
  GenerationStatus,
  ImageFormat,
  VideoAssetKind,
} from "../generated/prisma/enums.js";

export class VideoAssetRepository {
  async create(data: {
    projectId: string;
    brandKitId?: string | null;
    videoGroupId: string;
    kind: VideoAssetKind;
    prompt: string;
    output?: string | null;
    provider?: string | null;
    width?: number | null;
    height?: number | null;
    format?: ImageFormat | null;
    model?: string | null;
    status?: GenerationStatus;
    generationTimeMs?: number | null;
    createdBy?: string | null;
  }) {
    return prisma.videoAsset.create({
      data,
    });
  }

  async update(
    id: string,
    data: {
      status?: GenerationStatus;
      model?: string | null;
      storagePath?: string | null;
      thumbnailPath?: string | null;
      errorMessage?: string | null;
      generationTimeMs?: number | null;
    }
  ) {
    return prisma.videoAsset.update({
      where: { id },
      data,
    });
  }

  async findById(id: string, userId: string) {
    return prisma.videoAsset.findFirst({
      where: { id, project: { userId } },
    });
  }

  // videoGroupId/kind are optional narrowing filters — omitted, this has the
  // same shape/behavior as ImageRepository.findMany(), which is what
  // AssetService's aggregation relies on.
  async findMany(options: {
    projectId: string;
    userId: string;
    skip: number;
    take: number;
    videoGroupId?: string;
    kind?: VideoAssetKind;
  }) {
    return prisma.videoAsset.findMany({
      where: {
        projectId: options.projectId,
        project: { userId: options.userId },
        ...(options.videoGroupId ? { videoGroupId: options.videoGroupId } : {}),
        ...(options.kind ? { kind: options.kind } : {}),
      },

      skip: options.skip,
      take: options.take,

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async count(
    projectId: string,
    userId: string,
    filters?: { videoGroupId?: string; kind?: VideoAssetKind }
  ) {
    return prisma.videoAsset.count({
      where: {
        projectId,
        project: { userId },
        ...(filters?.videoGroupId ? { videoGroupId: filters.videoGroupId } : {}),
        ...(filters?.kind ? { kind: filters.kind } : {}),
      },
    });
  }

  async delete(id: string) {
    return prisma.videoAsset.delete({
      where: { id },
    });
  }
}

export const videoAssetRepository = new VideoAssetRepository();

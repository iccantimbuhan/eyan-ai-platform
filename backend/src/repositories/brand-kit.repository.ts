import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { CreateBrandKitDto, UpdateBrandKitDto } from "../dto/brand-kit.dto.js";

// Same pattern as AssetReviewRepository's toJsonInput: Prisma's JSON input
// type doesn't structurally accept a plain DTO array/object without going
// through `unknown` first.
function toJsonInput<T>(value: T | undefined): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as unknown as Prisma.InputJsonValue);
}

export class BrandKitRepository {
  async create(data: CreateBrandKitDto & { createdBy: string }) {
    return prisma.brandKit.create({
      data: {
        ...data,
        logos: toJsonInput(data.logos),
        primaryColors: toJsonInput(data.primaryColors),
        secondaryColors: toJsonInput(data.secondaryColors),
        fonts: toJsonInput(data.fonts),
      },
    });
  }

  // Transitive ownership, matching ContentRepository/ImageRepository: a
  // BrandKit has no userId column of its own — ownership is enforced via
  // its parent project's userId. See docs/ASSET_LIBRARY.md.
  async findById(id: string, userId: string) {
    return prisma.brandKit.findFirst({
      where: { id, project: { userId } },
    });
  }

  async findManyByProject(projectId: string, userId: string) {
    return prisma.brandKit.findMany({
      where: { projectId, project: { userId } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async update(id: string, data: UpdateBrandKitDto) {
    return prisma.brandKit.update({
      where: { id },
      data: {
        ...data,
        logos: toJsonInput(data.logos),
        primaryColors: toJsonInput(data.primaryColors),
        secondaryColors: toJsonInput(data.secondaryColors),
        fonts: toJsonInput(data.fonts),
      },
    });
  }

  async delete(id: string) {
    return prisma.brandKit.delete({
      where: { id },
    });
  }
}

export const brandKitRepository = new BrandKitRepository();

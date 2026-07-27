import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const findManyMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    assetVersion: {
      findUnique: findUniqueMock,
      findMany: findManyMock,
      create: createMock,
      update: updateMock,
    },
  },
}));

const { AssetVersionRepository } = await import(
  "./asset-version.repository.js"
);

describe("AssetVersionRepository", () => {
  const repository = new AssetVersionRepository();

  beforeEach(() => {
    findUniqueMock.mockReset();
    findManyMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
  });

  it("finds one by the compound (assetType, sourceId) unique key", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findOne("BLOG", "content-1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { assetType_sourceId: { assetType: "BLOG", sourceId: "content-1" } },
    });
  });

  it("returns an empty array without calling Prisma when there are no pairs", async () => {
    const result = await repository.findManyBySourceIds([]);

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("finds many by an OR of (assetType, sourceId) pairs", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyBySourceIds([
      { assetType: "BLOG", sourceId: "content-1" },
      { assetType: "IMAGE", sourceId: "image-1" },
    ]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { assetType: "BLOG", sourceId: "content-1" },
          { assetType: "IMAGE", sourceId: "image-1" },
        ],
      },
    });
  });

  it("finds a lineage's full history ordered oldest-to-newest", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findLineage("lineage-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { lineageId: "lineage-1" },
      orderBy: { versionNumber: "asc" },
    });
  });

  it("creates the first version, then self-updates lineageId to its own id", async () => {
    createMock.mockResolvedValue({ id: "version-1" });
    updateMock.mockResolvedValue({ id: "version-1", lineageId: "version-1" });

    const result = await repository.createFirstVersion(
      "IMAGE",
      "image-1",
      "project-1"
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        assetType: "IMAGE",
        sourceId: "image-1",
        projectId: "project-1",
        lineageId: "",
        versionNumber: 1,
      },
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "version-1" },
      data: { lineageId: "version-1" },
    });
    expect(result).toEqual({ id: "version-1", lineageId: "version-1" });
  });

  it("creates the next version, inheriting the lineage and incrementing the version number", async () => {
    createMock.mockResolvedValue({});

    await repository.createNextVersion("IMAGE", "image-2", "project-1", {
      id: "version-1",
      lineageId: "version-1",
      versionNumber: 1,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        assetType: "IMAGE",
        sourceId: "image-2",
        projectId: "project-1",
        lineageId: "version-1",
        versionNumber: 2,
        previousVersionId: "version-1",
      },
    });
  });
});

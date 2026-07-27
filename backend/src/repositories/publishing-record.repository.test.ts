import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
const updateMock = vi.fn();
const findUniqueMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    publishingRecord: {
      upsert: upsertMock,
      update: updateMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
    },
  },
}));

const { PublishingRecordRepository } = await import(
  "./publishing-record.repository.js"
);

describe("PublishingRecordRepository", () => {
  const repository = new PublishingRecordRepository();

  beforeEach(() => {
    upsertMock.mockReset();
    updateMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it("upserts a record keyed on (assetType, sourceId, platform)", async () => {
    upsertMock.mockResolvedValue({});

    const scheduledFor = new Date("2026-08-01T00:00:00.000Z");

    await repository.upsert("IMAGE", "image-1", "project-1", "fake", {
      createdById: "user-1",
      status: "SCHEDULED",
      scheduledFor,
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        assetType_sourceId_platform: {
          assetType: "IMAGE",
          sourceId: "image-1",
          platform: "fake",
        },
      },
      create: {
        assetType: "IMAGE",
        sourceId: "image-1",
        projectId: "project-1",
        platform: "fake",
        status: "SCHEDULED",
        scheduledFor,
        createdById: "user-1",
      },
      update: {
        status: "SCHEDULED",
        scheduledFor,
      },
    });
  });

  it("updates a record by id", async () => {
    updateMock.mockResolvedValue({});

    await repository.update("record-1", {
      status: "PUBLISHED",
      publishedAt: new Date("2026-08-01T00:00:00.000Z"),
      externalId: "ext-1",
      externalUrl: "https://example.com/ext-1",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "record-1" },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date("2026-08-01T00:00:00.000Z"),
        externalId: "ext-1",
        externalUrl: "https://example.com/ext-1",
      },
    });
  });

  it("finds one by the compound key", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findOne("IMAGE", "image-1", "fake");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        assetType_sourceId_platform: {
          assetType: "IMAGE",
          sourceId: "image-1",
          platform: "fake",
        },
      },
    });
  });

  it("finds many by source, ordered ascending", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyBySource("IMAGE", "image-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { assetType: "IMAGE", sourceId: "image-1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns an empty array without calling Prisma when there are no pairs", async () => {
    const result = await repository.findManyBySourceIds([]);

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("finds many by an OR of pairs", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyBySourceIds([
      { assetType: "IMAGE", sourceId: "image-1" },
    ]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { OR: [{ assetType: "IMAGE", sourceId: "image-1" }] },
    });
  });

  it("finds many by project", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyByProject("project-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
    });
  });
});

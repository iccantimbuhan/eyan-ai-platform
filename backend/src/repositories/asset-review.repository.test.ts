import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    assetReview: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      upsert: upsertMock,
      deleteMany: deleteManyMock,
    },
  },
}));

const { AssetReviewRepository } = await import("./asset-review.repository.js");

describe("AssetReviewRepository", () => {
  const repository = new AssetReviewRepository();

  beforeEach(() => {
    findManyMock.mockReset();
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    deleteManyMock.mockReset();
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

  it("finds one by the compound (assetType, sourceId) unique key, including the reviewer", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findOne("IMAGE", "image-1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { assetType_sourceId: { assetType: "IMAGE", sourceId: "image-1" } },
      include: { reviewer: true },
    });
  });

  it("upserts a create branch defaulting status to DRAFT when unset", async () => {
    upsertMock.mockResolvedValue({});

    await repository.upsert("BLOG", "content-1", "project-1", {});

    expect(upsertMock).toHaveBeenCalledWith({
      where: { assetType_sourceId: { assetType: "BLOG", sourceId: "content-1" } },
      create: {
        assetType: "BLOG",
        sourceId: "content-1",
        projectId: "project-1",
        status: "DRAFT",
        reviewerId: undefined,
        reviewedAt: undefined,
        notes: undefined,
        qaScore: undefined,
        checklist: undefined,
      },
      update: {},
    });
  });

  it("only includes provided fields in the update branch", async () => {
    upsertMock.mockResolvedValue({});

    await repository.upsert("IMAGE", "image-1", "project-1", {
      status: "APPROVED",
      reviewerId: "user-1",
      reviewedAt: new Date("2026-01-01"),
    });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          status: "APPROVED",
          reviewerId: "user-1",
          reviewedAt: new Date("2026-01-01"),
        },
      })
    );
  });

  it("passes the checklist through as JSON input on both branches", async () => {
    upsertMock.mockResolvedValue({});
    const checklist = [
      { category: "content" as const, item: "Grammar", result: "PASS" as const },
    ];

    await repository.upsert("BLOG", "content-1", "project-1", { checklist });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ checklist }),
        update: { checklist },
      })
    );
  });

  it("deletes by (assetType, sourceId) via deleteMany, never a plain delete", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await repository.deleteBySource("IMAGE", "image-1");

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { assetType: "IMAGE", sourceId: "image-1" },
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

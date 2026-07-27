import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();
const updateMock = vi.fn();
const findUniqueMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    assetComment: {
      create: createMock,
      findMany: findManyMock,
      update: updateMock,
      findUnique: findUniqueMock,
      deleteMany: deleteManyMock,
    },
  },
}));

const { AssetCommentRepository } = await import("./asset-comment.repository.js");

describe("AssetCommentRepository", () => {
  const repository = new AssetCommentRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
    updateMock.mockReset();
    findUniqueMock.mockReset();
    deleteManyMock.mockReset();
  });

  it("creates a comment with the raw data passed through", async () => {
    createMock.mockResolvedValue({});

    const data = {
      projectId: "project-1",
      assetType: "IMAGE" as const,
      sourceId: "image-1",
      authorId: "user-1",
      body: "Looks great",
      isInternal: false,
    };

    await repository.create(data);

    expect(createMock).toHaveBeenCalledWith({ data });
  });

  it("finds many by source ordered oldest-to-newest", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyBySource("IMAGE", "image-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { assetType: "IMAGE", sourceId: "image-1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("returns an empty array without calling Prisma when there are no pairs (findManyBySourceIds)", async () => {
    const result = await repository.findManyBySourceIds([]);

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("finds many by an OR of (assetType, sourceId) pairs", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyBySourceIds([
      { assetType: "BLOG", sourceId: "content-1" },
    ]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { OR: [{ assetType: "BLOG", sourceId: "content-1" }] },
    });
  });

  it("resolves a comment, stamping resolvedAt and resolvedBy", async () => {
    updateMock.mockResolvedValue({});

    await repository.resolve("comment-1", "user-1");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { resolvedAt: expect.any(Date), resolvedBy: "user-1" },
    });
  });

  it("finds a comment by id", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findById("comment-1");

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });

  it("deletes by id via deleteMany, never a plain delete", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await repository.delete("comment-1");

    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });
});

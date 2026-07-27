import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
const findUniqueMock = vi.fn();
const findManyMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    assetReviewAssignment: {
      upsert: upsertMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
      deleteMany: deleteManyMock,
    },
  },
}));

const { AssetReviewAssignmentRepository } = await import(
  "./asset-review-assignment.repository.js"
);

describe("AssetReviewAssignmentRepository", () => {
  const repository = new AssetReviewAssignmentRepository();

  beforeEach(() => {
    upsertMock.mockReset();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
    deleteManyMock.mockReset();
  });

  it("upserts an assignment, replacing the assignee on the update branch", async () => {
    upsertMock.mockResolvedValue({});

    await repository.upsert("IMAGE", "image-1", "project-1", {
      assigneeId: "user-2",
      assignedById: "user-1",
      note: "please check colors",
    });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { assetType_sourceId: { assetType: "IMAGE", sourceId: "image-1" } },
      create: {
        assetType: "IMAGE",
        sourceId: "image-1",
        projectId: "project-1",
        assigneeId: "user-2",
        assignedById: "user-1",
        note: "please check colors",
      },
      update: {
        assigneeId: "user-2",
        assignedById: "user-1",
        note: "please check colors",
      },
    });
  });

  it("finds one by the compound key, including the assignee", async () => {
    findUniqueMock.mockResolvedValue(null);

    await repository.findOne("IMAGE", "image-1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { assetType_sourceId: { assetType: "IMAGE", sourceId: "image-1" } },
      include: { assignee: true },
    });
  });

  it("returns an empty array without calling Prisma when there are no pairs", async () => {
    const result = await repository.findManyBySourceIds([]);

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("finds many by an OR of pairs, including the assignee", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyBySourceIds([
      { assetType: "IMAGE", sourceId: "image-1" },
    ]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { OR: [{ assetType: "IMAGE", sourceId: "image-1" }] },
      include: { assignee: true },
    });
  });

  it("deletes by (assetType, sourceId) via deleteMany, never a plain delete", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await repository.delete("IMAGE", "image-1");

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { assetType: "IMAGE", sourceId: "image-1" },
    });
  });
});

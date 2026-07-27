import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    assetReviewEvent: {
      create: createMock,
      findMany: findManyMock,
    },
  },
}));

const { AssetReviewEventRepository } = await import(
  "./asset-review-event.repository.js"
);

describe("AssetReviewEventRepository", () => {
  const repository = new AssetReviewEventRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
  });

  it("creates an event, passing metadata through as JSON input", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      projectId: "project-1",
      assetType: "IMAGE",
      sourceId: "image-1",
      type: "STATUS_CHANGED",
      actorId: "user-1",
      fromStatus: "NEEDS_REVIEW",
      toStatus: "APPROVED",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: "project-1",
        assetType: "IMAGE",
        sourceId: "image-1",
        type: "STATUS_CHANGED",
        actorId: "user-1",
        fromStatus: "NEEDS_REVIEW",
        toStatus: "APPROVED",
        metadata: undefined,
      },
    });
  });

  it("finds many by source, ordered oldest-to-newest, including the actor", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyBySource("IMAGE", "image-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { assetType: "IMAGE", sourceId: "image-1" },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  });

  it("finds many by project, ordered oldest-to-newest, including the actor", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyByProject("project-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  });

  it("finds many by an IN of project ids, ordered oldest-to-newest, including the actor", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findManyByProjectIds(["project-1", "project-2"]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: { in: ["project-1", "project-2"] } },
      orderBy: { createdAt: "asc" },
      include: { actor: true },
    });
  });

  it("returns an empty array without calling Prisma when there are no project ids", async () => {
    const result = await repository.findManyByProjectIds([]);

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});

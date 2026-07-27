import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();
const groupByMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    analyticsEvent: {
      create: createMock,
      findMany: findManyMock,
      groupBy: groupByMock,
    },
  },
}));

const { AnalyticsEventRepository } = await import(
  "./analytics-event.repository.js"
);

describe("AnalyticsEventRepository", () => {
  const repository = new AnalyticsEventRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
    groupByMock.mockReset();
  });

  it("creates a GENERATED event, passing metadata through as JSON input", async () => {
    createMock.mockResolvedValue({});

    await repository.create({
      projectId: "project-1",
      assetType: "IMAGE",
      sourceId: "image-1",
      type: "GENERATED",
      actorId: "user-1",
      provider: "fake",
      model: "fake-image-v1",
      generationTimeMs: 800,
      brandKitId: "bk-1",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: "project-1",
        assetType: "IMAGE",
        sourceId: "image-1",
        type: "GENERATED",
        actorId: "user-1",
        provider: "fake",
        model: "fake-image-v1",
        generationTimeMs: 800,
        brandKitId: "bk-1",
        metadata: undefined,
      },
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

  it("groups by assetType, counting and averaging generationTimeMs, scoped to a project", async () => {
    groupByMock.mockResolvedValue([]);

    await repository.groupByAssetType("project-1");

    expect(groupByMock).toHaveBeenCalledWith({
      by: ["assetType"],
      where: { projectId: "project-1" },
      _count: { _all: true },
      _avg: { generationTimeMs: true },
    });
  });

  it("groups by assetType across every project when none is given", async () => {
    groupByMock.mockResolvedValue([]);

    await repository.groupByAssetType();

    expect(groupByMock).toHaveBeenCalledWith({
      by: ["assetType"],
      where: undefined,
      _count: { _all: true },
      _avg: { generationTimeMs: true },
    });
  });

  it("groups by provider, excluding null providers, scoped to a project", async () => {
    groupByMock.mockResolvedValue([]);

    await repository.groupByProvider("project-1");

    expect(groupByMock).toHaveBeenCalledWith({
      by: ["provider"],
      where: { provider: { not: null }, projectId: "project-1" },
      _count: { _all: true },
      _avg: { generationTimeMs: true },
    });
  });

  it("groups by brand kit, excluding null brand kits, scoped to a project", async () => {
    groupByMock.mockResolvedValue([]);

    await repository.groupByBrandKit("project-1");

    expect(groupByMock).toHaveBeenCalledWith({
      by: ["brandKitId"],
      where: { projectId: "project-1", brandKitId: { not: null } },
      _count: { _all: true },
    });
  });
});

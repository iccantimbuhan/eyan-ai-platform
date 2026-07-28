import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const countMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    videoAsset: {
      create: createMock,
      findMany: findManyMock,
      findFirst: findFirstMock,
      update: updateMock,
      delete: deleteMock,
      count: countMock,
    },
  },
}));

const { VideoAssetRepository } = await import("./video-asset.repository.js");

describe("VideoAssetRepository", () => {
  const repository = new VideoAssetRepository();

  beforeEach(() => {
    createMock.mockReset();
    findManyMock.mockReset();
    findFirstMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    countMock.mockReset();
  });

  it("creates a video asset with the given fields", async () => {
    createMock.mockResolvedValue({ id: "va-1" });

    await repository.create({
      projectId: "project-1",
      videoGroupId: "group-1",
      kind: "SCRIPT",
      prompt: "A launch video",
      output: "INT. LAUNCH PAD - DAY",
      model: "qwen2.5-coder:7b",
      status: "COMPLETED",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: "project-1",
        videoGroupId: "group-1",
        kind: "SCRIPT",
        prompt: "A launch video",
        output: "INT. LAUNCH PAD - DAY",
        model: "qwen2.5-coder:7b",
        status: "COMPLETED",
      },
    });
  });

  it("creates an UPLOADED_SOURCE video asset with real file metadata (Sprint 7.2.1)", async () => {
    createMock.mockResolvedValue({ id: "va-2" });

    await repository.create({
      projectId: "project-1",
      videoGroupId: "group-2",
      kind: "UPLOADED_SOURCE",
      prompt: "my-video.mp4",
      provider: "upload",
      width: 1920,
      height: 1080,
      storagePath: "project-1/uuid.mp4",
      status: "COMPLETED",
      createdBy: "user-1",
      durationMs: 12500,
      videoFormat: "mp4",
      sourceFileName: "my-video.mp4",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: "project-1",
        videoGroupId: "group-2",
        kind: "UPLOADED_SOURCE",
        prompt: "my-video.mp4",
        provider: "upload",
        width: 1920,
        height: 1080,
        storagePath: "project-1/uuid.mp4",
        status: "COMPLETED",
        createdBy: "user-1",
        durationMs: 12500,
        videoFormat: "mp4",
        sourceFileName: "my-video.mp4",
      },
    });
  });

  it("scopes findById to both the id and the requesting user's project ownership", async () => {
    findFirstMock.mockResolvedValue(null);

    await repository.findById("va-1", "user-1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "va-1", project: { userId: "user-1" } },
    });
  });

  it("lists scoped to project + user, most recently created first, with no filters by default", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findMany({
      projectId: "project-1",
      userId: "user-1",
      skip: 0,
      take: 20,
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: "project-1", project: { userId: "user-1" } },
      skip: 0,
      take: 20,
      orderBy: { createdAt: "desc" },
    });
  });

  it("lists narrowed by videoGroupId and kind when provided", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.findMany({
      projectId: "project-1",
      userId: "user-1",
      skip: 0,
      take: 20,
      videoGroupId: "group-1",
      kind: "STORYBOARD",
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        project: { userId: "user-1" },
        videoGroupId: "group-1",
        kind: "STORYBOARD",
      },
      skip: 0,
      take: 20,
      orderBy: { createdAt: "desc" },
    });
  });

  it("updates only the provided fields", async () => {
    updateMock.mockResolvedValue({ id: "va-1" });

    await repository.update("va-1", { status: "COMPLETED", storagePath: "p.png" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "va-1" },
      data: { status: "COMPLETED", storagePath: "p.png" },
    });
  });

  it("counts scoped to project + user", async () => {
    countMock.mockResolvedValue(0);

    await repository.count("project-1", "user-1");

    expect(countMock).toHaveBeenCalledWith({
      where: { projectId: "project-1", project: { userId: "user-1" } },
    });
  });

  it("deletes by id", async () => {
    deleteMock.mockResolvedValue({ id: "va-1" });

    await repository.delete("va-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "va-1" } });
  });
});

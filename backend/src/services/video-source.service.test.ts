import { beforeEach, describe, expect, it, vi } from "vitest";

const { unlinkMock, probeVideoFileMock } = vi.hoisted(() => ({
  unlinkMock: vi.fn().mockResolvedValue(undefined),
  probeVideoFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  unlink: unlinkMock,
}));

vi.mock("../utils/ffprobe.util.js", () => ({
  probeVideoFile: probeVideoFileMock,
}));

import { VideoSourceService } from "./video-source.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { InvalidVideoFileError } from "../errors/video-source.error.js";

function createRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "video-1", projectId: "proj-1" }),
    ...overrides,
  };
}

function createProjectRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "proj-1", userId: "user-1" }),
    ...overrides,
  };
}

function createStorageProvider(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    save: vi.fn().mockResolvedValue({
      path: "proj-1/uuid.mp4",
      url: "/uploads/images/proj-1/uuid.mp4",
      bytes: 4096,
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    getUrl: vi.fn().mockReturnValue("/uploads/images/proj-1/uuid.mp4"),
    ...overrides,
  };
}

function createAnalyticsEventRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "event-1" }),
    ...overrides,
  };
}

const VALID_PROBE = {
  durationMs: 12500,
  width: 1920,
  height: 1080,
  videoCodec: "h264",
  containerFormat: "mp4",
  hasAudio: true,
};

describe("VideoSourceService.ingest", () => {
  beforeEach(() => {
    unlinkMock.mockClear();
    probeVideoFileMock.mockReset();
    probeVideoFileMock.mockResolvedValue(VALID_PROBE);
  });

  function buildService(overrides?: {
    repository?: ReturnType<typeof createRepository>;
    projectRepository?: ReturnType<typeof createProjectRepository>;
    storageProvider?: ReturnType<typeof createStorageProvider>;
    analyticsEventRepository?: ReturnType<typeof createAnalyticsEventRepository>;
  }) {
    const repository = overrides?.repository ?? createRepository();
    const projectRepository = overrides?.projectRepository ?? createProjectRepository();
    const storageProvider = overrides?.storageProvider ?? createStorageProvider();
    const analyticsEventRepository =
      overrides?.analyticsEventRepository ?? createAnalyticsEventRepository();

    const service = new VideoSourceService(
      repository as never,
      projectRepository as never,
      storageProvider as never,
      analyticsEventRepository as never
    );

    return { service, repository, projectRepository, storageProvider, analyticsEventRepository };
  }

  it("creates a COMPLETED UPLOADED_SOURCE VideoAsset with ffprobe metadata after a successful upload", async () => {
    const { service, repository } = buildService();

    const result = await service.ingest(
      {
        projectId: "proj-1",
        tempFilePath: "/tmp/upload-1.mp4",
        originalFileName: "my-video.mp4",
      },
      "user-1"
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        kind: "UPLOADED_SOURCE",
        prompt: "my-video.mp4",
        provider: "upload",
        width: 1920,
        height: 1080,
        storagePath: "proj-1/uuid.mp4",
        status: "COMPLETED",
        createdBy: "user-1",
        durationMs: 12500,
        videoFormat: "mp4",
        sourceFileName: "my-video.mp4",
      })
    );
    expect(result).toEqual({ id: "video-1", projectId: "proj-1" });
  });

  it("generates a fresh videoGroupId when none is provided, and reuses one when given", async () => {
    const { service, repository } = buildService();

    await service.ingest(
      { projectId: "proj-1", tempFilePath: "/tmp/a.mp4", originalFileName: "a.mp4" },
      "user-1"
    );

    const firstCallGroupId = repository.create.mock.calls[0][0].videoGroupId;
    expect(typeof firstCallGroupId).toBe("string");
    expect(firstCallGroupId.length).toBeGreaterThan(0);

    await service.ingest(
      {
        projectId: "proj-1",
        videoGroupId: "existing-group",
        tempFilePath: "/tmp/b.mp4",
        originalFileName: "b.mp4",
      },
      "user-1"
    );

    expect(repository.create.mock.calls[1][0].videoGroupId).toBe("existing-group");
  });

  it("records a fire-and-forget analytics event on success", async () => {
    const { service, analyticsEventRepository } = buildService();

    await service.ingest(
      { projectId: "proj-1", tempFilePath: "/tmp/a.mp4", originalFileName: "a.mp4" },
      "user-1"
    );

    await Promise.resolve();

    expect(analyticsEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        assetType: "VIDEO",
        sourceId: "video-1",
        type: "GENERATED",
        actorId: "user-1",
        provider: "upload",
      })
    );
  });

  it("throws NotFoundError and deletes the temp file when the project doesn't belong to the user", async () => {
    const { service, storageProvider } = buildService({
      projectRepository: createProjectRepository({ findById: vi.fn().mockResolvedValue(null) }),
    });

    await expect(
      service.ingest(
        { projectId: "proj-1", tempFilePath: "/tmp/a.mp4", originalFileName: "a.mp4" },
        "user-1"
      )
    ).rejects.toThrow(NotFoundError);

    expect(unlinkMock).toHaveBeenCalledWith("/tmp/a.mp4");
    expect(storageProvider.save).not.toHaveBeenCalled();
  });

  it("throws InvalidVideoFileError and deletes the temp file for an unsupported extension", async () => {
    const { service, storageProvider } = buildService();

    await expect(
      service.ingest(
        { projectId: "proj-1", tempFilePath: "/tmp/a.exe", originalFileName: "a.exe" },
        "user-1"
      )
    ).rejects.toThrow(InvalidVideoFileError);

    expect(unlinkMock).toHaveBeenCalledWith("/tmp/a.exe");
    expect(storageProvider.save).not.toHaveBeenCalled();
    expect(probeVideoFileMock).not.toHaveBeenCalled();
  });

  it("throws InvalidVideoFileError and deletes the temp file when ffprobe rejects the file", async () => {
    probeVideoFileMock.mockRejectedValue(new Error("does not contain a video stream"));

    const { service, storageProvider } = buildService();

    await expect(
      service.ingest(
        { projectId: "proj-1", tempFilePath: "/tmp/a.mp4", originalFileName: "a.mp4" },
        "user-1"
      )
    ).rejects.toThrow(InvalidVideoFileError);

    expect(unlinkMock).toHaveBeenCalledWith("/tmp/a.mp4");
    expect(storageProvider.save).not.toHaveBeenCalled();
  });

  it("throws InvalidVideoFileError and deletes the temp file when storage fails", async () => {
    const { service, repository } = buildService({
      storageProvider: createStorageProvider({
        save: vi.fn().mockRejectedValue(new Error("disk full")),
      }),
    });

    await expect(
      service.ingest(
        { projectId: "proj-1", tempFilePath: "/tmp/a.mp4", originalFileName: "a.mp4" },
        "user-1"
      )
    ).rejects.toThrow(InvalidVideoFileError);

    expect(unlinkMock).toHaveBeenCalledWith("/tmp/a.mp4");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("does not fail ingestion when the analytics write itself fails", async () => {
    const { service } = buildService({
      analyticsEventRepository: createAnalyticsEventRepository({
        create: vi.fn().mockRejectedValue(new Error("db down")),
      }),
    });

    await expect(
      service.ingest(
        { projectId: "proj-1", tempFilePath: "/tmp/a.mp4", originalFileName: "a.mp4" },
        "user-1"
      )
    ).resolves.toBeDefined();
  });
});

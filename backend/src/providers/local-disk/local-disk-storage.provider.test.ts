import { beforeEach, describe, expect, it, vi } from "vitest";

const mkdirMock = vi.fn().mockResolvedValue(undefined);
const writeFileMock = vi.fn().mockResolvedValue(undefined);
const rmMock = vi.fn().mockResolvedValue(undefined);
const renameMock = vi.fn().mockResolvedValue(undefined);
const statMock = vi.fn().mockResolvedValue({ size: 123 });
const unlinkMock = vi.fn().mockResolvedValue(undefined);
const copyFileMock = vi.fn().mockResolvedValue(undefined);
const randomUUIDMock = vi.fn().mockReturnValue("fixed-uuid");
const mkdirSyncMock = vi.fn();
const accessSyncMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
  rm: rmMock,
  rename: renameMock,
  stat: statMock,
  unlink: unlinkMock,
  copyFile: copyFileMock,
}));

vi.mock("node:fs", () => ({
  mkdirSync: mkdirSyncMock,
  accessSync: accessSyncMock,
  constants: { W_OK: 2 },
}));

vi.mock("node:crypto", () => ({
  randomUUID: randomUUIDMock,
}));

vi.mock("../../config/env.js", () => ({
  env: {
    storageLocalRoot: "/test-storage-root",
    storagePublicBaseUrl: "/uploads/images",
    videoUploadTempDir: "/test-video-tmp",
  },
}));

const { LocalDiskStorageProvider, validateLocalDiskStorageConfig } =
  await import("./local-disk-storage.provider.js");

describe("LocalDiskStorageProvider", () => {
  const provider = new LocalDiskStorageProvider();

  beforeEach(() => {
    mkdirMock.mockClear();
    writeFileMock.mockClear();
    rmMock.mockClear();
    renameMock.mockClear().mockResolvedValue(undefined);
    statMock.mockClear().mockResolvedValue({ size: 123 });
    unlinkMock.mockClear();
    copyFileMock.mockClear();
    mkdirSyncMock.mockReset();
    accessSyncMock.mockReset();
  });

  it("saves a file under <root>/<projectId>/<uuid>.<extension>", async () => {
    const result = await provider.save({
      buffer: Buffer.from("fake-image-bytes"),
      projectId: "proj-1",
      extension: "png",
    });

    expect(mkdirMock).toHaveBeenCalledWith(
      "/test-storage-root/proj-1",
      { recursive: true }
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      "/test-storage-root/proj-1/fixed-uuid.png",
      expect.any(Buffer)
    );
    expect(result).toEqual({
      path: "proj-1/fixed-uuid.png",
      url: "/uploads/images/proj-1/fixed-uuid.png",
      bytes: Buffer.from("fake-image-bytes").byteLength,
    });
  });

  it("normalizes a leading-dot / uppercase extension", async () => {
    await provider.save({
      buffer: Buffer.from("x"),
      projectId: "proj-1",
      extension: ".PNG",
    });

    expect(writeFileMock).toHaveBeenCalledWith(
      "/test-storage-root/proj-1/fixed-uuid.png",
      expect.any(Buffer)
    );
  });

  it("rejects an unsupported extension", async () => {
    await expect(
      provider.save({
        buffer: Buffer.from("x"),
        projectId: "proj-1",
        extension: "exe",
      })
    ).rejects.toThrow("Unsupported file extension");

    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("rejects a projectId that isn't a safe path segment", async () => {
    await expect(
      provider.save({
        buffer: Buffer.from("x"),
        projectId: "../../etc",
        extension: "png",
      })
    ).rejects.toThrow("Invalid projectId");

    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("deletes a file by its stored relative path", async () => {
    await provider.delete("proj-1/fixed-uuid.png");

    expect(rmMock).toHaveBeenCalledWith(
      "/test-storage-root/proj-1/fixed-uuid.png",
      { force: true }
    );
  });

  it("rejects a delete path that escapes the storage root", async () => {
    await expect(
      provider.delete("../outside.png")
    ).rejects.toThrow("escapes the storage root");

    expect(rmMock).not.toHaveBeenCalled();
  });

  it("builds a URL from the public base URL and the stored path", () => {
    expect(provider.getUrl("proj-1/fixed-uuid.png")).toBe(
      "/uploads/images/proj-1/fixed-uuid.png"
    );
  });

  it("moves a sourcePath file into the storage root instead of buffering it", async () => {
    const result = await provider.save({
      sourcePath: "/test-video-tmp/upload-1.mp4",
      projectId: "proj-1",
      extension: "mp4",
    });

    expect(statMock).toHaveBeenCalledWith("/test-video-tmp/upload-1.mp4");
    expect(renameMock).toHaveBeenCalledWith(
      "/test-video-tmp/upload-1.mp4",
      "/test-storage-root/proj-1/fixed-uuid.mp4"
    );
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      path: "proj-1/fixed-uuid.mp4",
      url: "/uploads/images/proj-1/fixed-uuid.mp4",
      bytes: 123,
    });
  });

  it("falls back to copy+unlink when sourcePath is on a different filesystem (EXDEV)", async () => {
    const exdev = Object.assign(new Error("cross-device link"), { code: "EXDEV" });
    renameMock.mockRejectedValueOnce(exdev);

    const result = await provider.save({
      sourcePath: "/test-video-tmp/upload-1.mp4",
      projectId: "proj-1",
      extension: "mp4",
    });

    expect(copyFileMock).toHaveBeenCalledWith(
      "/test-video-tmp/upload-1.mp4",
      "/test-storage-root/proj-1/fixed-uuid.mp4"
    );
    expect(unlinkMock).toHaveBeenCalledWith("/test-video-tmp/upload-1.mp4");
    expect(result.bytes).toBe(123);
  });

  it("rejects when neither buffer nor sourcePath is provided", async () => {
    await expect(
      provider.save({ projectId: "proj-1", extension: "mp4" } as never)
    ).rejects.toThrow("requires either buffer or sourcePath");
  });
});

describe("validateLocalDiskStorageConfig", () => {
  beforeEach(() => {
    mkdirSyncMock.mockReset();
    accessSyncMock.mockReset();
  });

  it("does not throw when the storage root and video temp dir can be created and are writable", () => {
    mkdirSyncMock.mockReturnValue(undefined);
    accessSyncMock.mockReturnValue(undefined);

    expect(() => validateLocalDiskStorageConfig()).not.toThrow();

    expect(mkdirSyncMock).toHaveBeenCalledWith("/test-storage-root", {
      recursive: true,
    });
    expect(accessSyncMock).toHaveBeenCalledWith("/test-storage-root", 2);
    expect(mkdirSyncMock).toHaveBeenCalledWith("/test-video-tmp", {
      recursive: true,
    });
    expect(accessSyncMock).toHaveBeenCalledWith("/test-video-tmp", 2);
  });

  it("throws a clear error when the video upload temp dir isn't writable", () => {
    mkdirSyncMock.mockReturnValue(undefined);
    accessSyncMock.mockImplementation((dir: string) => {
      if (dir === "/test-video-tmp") {
        throw new Error("EACCES: permission denied");
      }
    });

    expect(() => validateLocalDiskStorageConfig()).toThrow(
      /Video upload temp directory .* is not writable/
    );
  });

  it("throws a clear error when the storage root can't be created", () => {
    mkdirSyncMock.mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });

    expect(() => validateLocalDiskStorageConfig()).toThrow(
      /Local image storage root .* is not writable: EACCES/
    );
  });

  it("throws a clear error when the storage root exists but isn't writable", () => {
    mkdirSyncMock.mockReturnValue(undefined);
    accessSyncMock.mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });

    expect(() => validateLocalDiskStorageConfig()).toThrow(
      /Local image storage root .* is not writable/
    );
  });
});

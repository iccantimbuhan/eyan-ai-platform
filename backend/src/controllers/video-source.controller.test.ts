import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestMock = vi.fn();

vi.mock("../services/video-source.service.js", () => ({
  VideoSourceService: vi.fn().mockImplementation(function (this: unknown) {
    return { ingest: ingestMock };
  }),
}));

const { VideoSourceController } = await import("./video-source.controller.js");

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("VideoSourceController.upload", () => {
  beforeEach(() => {
    ingestMock.mockReset();
    ingestMock.mockResolvedValue({
      id: "video-1",
      projectId: "proj-1",
      brandKitId: null,
      videoGroupId: "group-1",
      kind: "UPLOADED_SOURCE",
      prompt: "my-video.mp4",
      output: null,
      provider: "upload",
      width: 1920,
      height: 1080,
      format: null,
      storagePath: "proj-1/uuid.mp4",
      thumbnailPath: null,
      model: null,
      status: "COMPLETED",
      errorMessage: null,
      generationTimeMs: null,
      durationMs: 12500,
      videoFormat: "mp4",
      sourceFileName: "my-video.mp4",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });
  });

  it("passes the uploaded file path/name and body fields through to the service", async () => {
    const req = {
      body: { projectId: "proj-1", videoGroupId: "group-1" },
      file: { path: "/tmp/upload-1.mp4", originalname: "my-video.mp4" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoSourceController.upload(req, res);

    expect(ingestMock).toHaveBeenCalledWith(
      {
        projectId: "proj-1",
        videoGroupId: "group-1",
        tempFilePath: "/tmp/upload-1.mp4",
        originalFileName: "my-video.mp4",
      },
      "user-1"
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("omits videoGroupId when the body didn't include one", async () => {
    const req = {
      body: { projectId: "proj-1" },
      file: { path: "/tmp/upload-1.mp4", originalname: "my-video.mp4" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoSourceController.upload(req, res);

    expect(ingestMock).toHaveBeenCalledWith(
      expect.objectContaining({ videoGroupId: undefined }),
      "user-1"
    );
  });

  it("throws NoVideoFileProvidedError when multer didn't attach a file", async () => {
    const req = {
      body: { projectId: "proj-1" },
      file: undefined,
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await expect(VideoSourceController.upload(req, res)).rejects.toThrow(
      "No video file was provided."
    );
    expect(ingestMock).not.toHaveBeenCalled();
  });
});

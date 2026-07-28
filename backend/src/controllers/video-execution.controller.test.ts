import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();

vi.mock("../services/video-execution-engine.service.js", () => ({
  VideoExecutionEngineService: vi.fn().mockImplementation(function (this: unknown) {
    return { execute: executeMock };
  }),
}));

const { VideoExecutionController } = await import("./video-execution.controller.js");

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("VideoExecutionController.execute", () => {
  beforeEach(() => {
    executeMock.mockReset();
    executeMock.mockResolvedValue({
      id: "video-2",
      projectId: "proj-1",
      brandKitId: null,
      videoGroupId: "group-1",
      kind: "EDITED_VIDEO",
      prompt: "remove silence and resize",
      output: null,
      provider: "ffmpeg",
      width: 1080,
      height: 1920,
      format: null,
      storagePath: "proj-1/edited.mp4",
      thumbnailPath: null,
      model: null,
      status: "COMPLETED",
      errorMessage: null,
      generationTimeMs: null,
      durationMs: 9000,
      videoFormat: "mp4",
      sourceFileName: "edited-my-video.mp4",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });
  });

  it("parses a valid body, calls the service, and returns 201", async () => {
    const req = {
      body: { workflowPlanId: "plan-1" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoExecutionController.execute(req, res);

    expect(executeMock).toHaveBeenCalledWith({ workflowPlanId: "plan-1" }, "user-1");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 400 and never calls the service when workflowPlanId is missing", async () => {
    const req = {
      body: {},
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoExecutionController.execute(req, res);

    expect(executeMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

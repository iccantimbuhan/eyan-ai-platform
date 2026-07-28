import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const planMock = vi.fn();
const listMock = vi.fn();

vi.mock("../services/video-workflow-planner.service.js", () => ({
  VideoWorkflowPlannerService: vi.fn().mockImplementation(function (this: unknown) {
    return { plan: planMock, list: listMock };
  }),
}));

const { VideoWorkflowPlannerController } = await import("./video-workflow-planner.controller.js");

function createResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("VideoWorkflowPlannerController.plan", () => {
  beforeEach(() => {
    planMock.mockReset();
    planMock.mockResolvedValue({
      id: "plan-1",
      projectId: "proj-1",
      videoAssetId: "video-1",
      prompt: "remove silence and add subtitles",
      workflow: { steps: [{ operation: "remove_silence", params: {} }] },
      model: "qwen2.5-coder:7b",
      createdBy: "user-1",
      createdAt: new Date("2026-01-01"),
    });
  });

  it("parses a valid body, calls the service, and returns 201", async () => {
    const req = {
      body: { videoAssetId: "video-1", prompt: "remove silence and add subtitles" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoWorkflowPlannerController.plan(req, res);

    expect(planMock).toHaveBeenCalledWith(
      { videoAssetId: "video-1", prompt: "remove silence and add subtitles" },
      "user-1"
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 400 and never calls the service when the prompt is missing", async () => {
    const req = {
      body: { videoAssetId: "video-1" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoWorkflowPlannerController.plan(req, res);

    expect(planMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it("returns 400 and never calls the service when videoAssetId is missing", async () => {
    const req = {
      body: { prompt: "remove silence" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoWorkflowPlannerController.plan(req, res);

    expect(planMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("VideoWorkflowPlannerController.list", () => {
  beforeEach(() => {
    listMock.mockReset();
    listMock.mockResolvedValue([
      {
        id: "plan-1",
        projectId: "proj-1",
        videoAssetId: "video-1",
        prompt: "remove silence",
        workflow: { steps: [{ operation: "remove_silence", params: {} }] },
        model: "qwen2.5-coder:7b",
        resultVideoAssetId: null,
        executedAt: null,
        createdAt: new Date("2026-01-01"),
      },
    ]);
  });

  it("passes projectId and the authenticated user to the service and returns 200", async () => {
    const req = {
      query: { projectId: "proj-1" },
      user: { id: "user-1" },
    } as unknown as Request;
    const res = createResponse();

    await VideoWorkflowPlannerController.list(req, res);

    expect(listMock).toHaveBeenCalledWith("proj-1", "user-1");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

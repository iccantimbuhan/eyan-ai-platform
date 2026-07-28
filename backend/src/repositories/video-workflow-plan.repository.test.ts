import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findFirstMock = vi.fn();
const findManyMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    videoWorkflowPlan: {
      create: createMock,
      findFirst: findFirstMock,
      findMany: findManyMock,
      update: updateMock,
    },
  },
}));

const { VideoWorkflowPlanRepository } = await import("./video-workflow-plan.repository.js");

describe("VideoWorkflowPlanRepository", () => {
  const repository = new VideoWorkflowPlanRepository();

  beforeEach(() => {
    createMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    updateMock.mockReset();
  });

  it("creates a workflow plan with the given fields", async () => {
    createMock.mockResolvedValue({ id: "plan-1" });

    await repository.create({
      projectId: "proj-1",
      videoAssetId: "video-1",
      prompt: "remove silence",
      workflow: { steps: [] },
      model: "qwen2.5-coder:7b",
      createdBy: "user-1",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        projectId: "proj-1",
        videoAssetId: "video-1",
        prompt: "remove silence",
        workflow: { steps: [] },
        model: "qwen2.5-coder:7b",
        createdBy: "user-1",
      },
    });
  });

  it("finds a plan by id scoped to the owning user", async () => {
    findFirstMock.mockResolvedValue({ id: "plan-1" });

    const result = await repository.findById("plan-1", "user-1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "plan-1", project: { userId: "user-1" } },
    });
    expect(result).toEqual({ id: "plan-1" });
  });

  it("lists plans for a project scoped to the owning user, newest first", async () => {
    findManyMock.mockResolvedValue([{ id: "plan-1" }]);

    await repository.findManyByProject("proj-1", "user-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { projectId: "proj-1", project: { userId: "user-1" } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("marks a plan executed with the result asset id and a timestamp", async () => {
    updateMock.mockResolvedValue({ id: "plan-1", resultVideoAssetId: "video-2" });

    await repository.markExecuted("plan-1", "video-2");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: { resultVideoAssetId: "video-2", executedAt: expect.any(Date) },
    });
  });
});

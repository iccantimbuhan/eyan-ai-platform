import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoWorkflowPlannerService } from "./video-workflow-planner.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  InvalidWorkflowSourceError,
  WorkflowPlanningFailedError,
} from "../errors/video-workflow.error.js";

const VALID_VIDEO_ASSET = {
  id: "video-1",
  projectId: "proj-1",
  kind: "UPLOADED_SOURCE",
  durationMs: 12500,
  width: 1920,
  height: 1080,
  videoFormat: "mp4",
};

const VALID_RESPONSE_TEXT = JSON.stringify({
  steps: [
    { operation: "remove_silence", params: {} },
    { operation: "resize", params: { aspectRatio: "9:16" } },
  ],
});

function createVideoAssetRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(VALID_VIDEO_ASSET),
    ...overrides,
  };
}

function createWorkflowPlanRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "plan-1" }),
    findManyByProject: vi.fn().mockResolvedValue([{ id: "plan-1" }]),
    ...overrides,
  };
}

function createChatService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    chat: vi.fn().mockResolvedValue({ model: "qwen2.5-coder:7b", response: VALID_RESPONSE_TEXT }),
    ...overrides,
  };
}

function createProjectRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({ id: "proj-1", userId: "user-1" }),
    ...overrides,
  };
}

function buildService(overrides?: {
  videoAssetRepository?: ReturnType<typeof createVideoAssetRepository>;
  workflowPlanRepository?: ReturnType<typeof createWorkflowPlanRepository>;
  chatService?: ReturnType<typeof createChatService>;
  projectRepository?: ReturnType<typeof createProjectRepository>;
}) {
  const videoAssetRepository = overrides?.videoAssetRepository ?? createVideoAssetRepository();
  const workflowPlanRepository =
    overrides?.workflowPlanRepository ?? createWorkflowPlanRepository();
  const chatService = overrides?.chatService ?? createChatService();
  const projectRepository = overrides?.projectRepository ?? createProjectRepository();

  const service = new VideoWorkflowPlannerService(
    videoAssetRepository as never,
    workflowPlanRepository as never,
    chatService as never,
    projectRepository as never
  );

  return { service, videoAssetRepository, workflowPlanRepository, chatService, projectRepository };
}

describe("VideoWorkflowPlannerService.plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a valid JSON response and persists the plan on the first attempt", async () => {
    const { service, chatService, workflowPlanRepository } = buildService();

    const result = await service.plan(
      { videoAssetId: "video-1", prompt: "remove the silence and make it vertical" },
      "user-1"
    );

    expect(chatService.chat).toHaveBeenCalledTimes(1);
    expect(workflowPlanRepository.create).toHaveBeenCalledWith({
      projectId: "proj-1",
      videoAssetId: "video-1",
      prompt: "remove the silence and make it vertical",
      workflow: {
        steps: [
          { operation: "remove_silence", params: {} },
          { operation: "resize", params: { aspectRatio: "9:16" } },
        ],
      },
      model: "qwen2.5-coder:7b",
      createdBy: "user-1",
    });
    expect(result).toEqual({ id: "plan-1" });
  });

  it("strips a markdown code fence before parsing", async () => {
    const { service, workflowPlanRepository } = buildService({
      chatService: createChatService({
        chat: vi.fn().mockResolvedValue({
          model: "qwen2.5-coder:7b",
          response: "```json\n" + VALID_RESPONSE_TEXT + "\n```",
        }),
      }),
    });

    await service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1");

    expect(workflowPlanRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: expect.objectContaining({ steps: expect.any(Array) }),
      })
    );
  });

  it("retries once on malformed JSON, then succeeds", async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce({ model: "qwen2.5-coder:7b", response: "not json at all" })
      .mockResolvedValueOnce({ model: "qwen2.5-coder:7b", response: VALID_RESPONSE_TEXT });

    const { service, workflowPlanRepository } = buildService({
      chatService: createChatService({ chat }),
    });

    const result = await service.plan(
      { videoAssetId: "video-1", prompt: "prompt" },
      "user-1"
    );

    expect(chat).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: "plan-1" });

    // The retry message includes the model's bad output and the parse error.
    const secondCallMessages = chat.mock.calls[1][0];
    expect(secondCallMessages.at(-2)).toEqual({
      role: "assistant",
      content: "not json at all",
    });
    expect(secondCallMessages.at(-1).role).toBe("user");
  });

  it("retries once on a validation failure (unknown operation), then succeeds", async () => {
    const invalidWorkflow = JSON.stringify({ steps: [{ operation: "delete_everything", params: {} }] });
    const chat = vi
      .fn()
      .mockResolvedValueOnce({ model: "qwen2.5-coder:7b", response: invalidWorkflow })
      .mockResolvedValueOnce({ model: "qwen2.5-coder:7b", response: VALID_RESPONSE_TEXT });

    const { service, workflowPlanRepository } = buildService({
      chatService: createChatService({ chat }),
    });

    await service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1");

    expect(chat).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).toHaveBeenCalledTimes(1);
  });

  it("regenerates when the AI proposes an operation outside the executable set (blur_faces), then succeeds", async () => {
    // blur_faces is a real operation the AI planner used to be able to
    // return (it was schema-valid but had no execution path) — this is the
    // exact regression this fix closes: the plan step now fails Zod
    // validation the same as any other malformed response, so the
    // service's existing one-shot corrective retry handles it without any
    // new code path.
    const unsupportedOpWorkflow = JSON.stringify({
      steps: [{ operation: "blur_faces", params: {} }],
    });
    const chat = vi
      .fn()
      .mockResolvedValueOnce({ model: "qwen2.5-coder:7b", response: unsupportedOpWorkflow })
      .mockResolvedValueOnce({ model: "qwen2.5-coder:7b", response: VALID_RESPONSE_TEXT });

    const { service, workflowPlanRepository } = buildService({
      chatService: createChatService({ chat }),
    });

    const result = await service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1");

    expect(chat).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: {
          steps: [
            { operation: "remove_silence", params: {} },
            { operation: "resize", params: { aspectRatio: "9:16" } },
          ],
        },
      })
    );
    expect(result).toEqual({ id: "plan-1" });
  });

  it("gives up and throws WorkflowPlanningFailedError when the AI keeps proposing unsupported operations", async () => {
    const unsupportedOpWorkflow = JSON.stringify({
      steps: [{ operation: "auto_zoom", params: {} }],
    });
    const chat = vi
      .fn()
      .mockResolvedValue({ model: "qwen2.5-coder:7b", response: unsupportedOpWorkflow });

    const { service, workflowPlanRepository } = buildService({
      chatService: createChatService({ chat }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(WorkflowPlanningFailedError);

    expect(chat).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).not.toHaveBeenCalled();
  });

  it("throws WorkflowPlanningFailedError after two failed attempts and never persists", async () => {
    const chat = vi.fn().mockResolvedValue({ model: "qwen2.5-coder:7b", response: "still not json" });

    const { service, chatService, workflowPlanRepository } = buildService({
      chatService: createChatService({ chat }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(WorkflowPlanningFailedError);

    expect(chatService.chat).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).not.toHaveBeenCalled();
  });

  it("throws NotFoundError and never calls the AI provider when the video asset doesn't exist", async () => {
    const { service, chatService } = buildService({
      videoAssetRepository: createVideoAssetRepository({ findById: vi.fn().mockResolvedValue(null) }),
    });

    await expect(
      service.plan({ videoAssetId: "missing", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(NotFoundError);

    expect(chatService.chat).not.toHaveBeenCalled();
  });

  it("throws InvalidWorkflowSourceError for a non-UPLOADED_SOURCE video asset and never calls the AI provider", async () => {
    const { service, chatService } = buildService({
      videoAssetRepository: createVideoAssetRepository({
        findById: vi.fn().mockResolvedValue({ ...VALID_VIDEO_ASSET, kind: "SCRIPT" }),
      }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(InvalidWorkflowSourceError);

    expect(chatService.chat).not.toHaveBeenCalled();
  });
});

describe("VideoWorkflowPlannerService.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists plans for a project the user owns", async () => {
    const { service, workflowPlanRepository } = buildService();

    const result = await service.list("proj-1", "user-1");

    expect(workflowPlanRepository.findManyByProject).toHaveBeenCalledWith("proj-1", "user-1");
    expect(result).toEqual([{ id: "plan-1" }]);
  });

  it("throws NotFoundError when the project doesn't belong to the user", async () => {
    const { service, workflowPlanRepository } = buildService({
      projectRepository: createProjectRepository({ findById: vi.fn().mockResolvedValue(null) }),
    });

    await expect(service.list("proj-1", "user-1")).rejects.toThrow(NotFoundError);
    expect(workflowPlanRepository.findManyByProject).not.toHaveBeenCalled();
  });
});

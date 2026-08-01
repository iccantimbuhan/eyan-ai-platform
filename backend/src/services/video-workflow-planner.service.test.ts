import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoWorkflowPlannerService } from "./video-workflow-planner.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { ApiError } from "../errors/api-error.js";
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

const VALID_WORKFLOW = {
  steps: [
    { operation: "remove_silence", params: {} },
    { operation: "resize", params: { aspectRatio: "9:16" } },
  ],
};

function validInvokeResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    output: JSON.stringify(VALID_WORKFLOW),
    outputJson: VALID_WORKFLOW,
    model: "qwen2.5-coder:7b",
    provider: "ollama",
    outcome: "VALID",
    ...overrides,
  };
}

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

function createCapabilityService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    invoke: vi.fn().mockResolvedValue(validInvokeResult()),
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
  capabilityService?: ReturnType<typeof createCapabilityService>;
  projectRepository?: ReturnType<typeof createProjectRepository>;
}) {
  const videoAssetRepository = overrides?.videoAssetRepository ?? createVideoAssetRepository();
  const workflowPlanRepository =
    overrides?.workflowPlanRepository ?? createWorkflowPlanRepository();
  const capabilityService = overrides?.capabilityService ?? createCapabilityService();
  const projectRepository = overrides?.projectRepository ?? createProjectRepository();

  const service = new VideoWorkflowPlannerService(
    videoAssetRepository as never,
    workflowPlanRepository as never,
    capabilityService as never,
    projectRepository as never
  );

  return { service, videoAssetRepository, workflowPlanRepository, capabilityService, projectRepository };
}

describe("VideoWorkflowPlannerService.plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a valid JSON response and persists the plan on the first attempt", async () => {
    const { service, capabilityService, workflowPlanRepository } = buildService();

    const result = await service.plan(
      { videoAssetId: "video-1", prompt: "remove the silence and make it vertical" },
      "user-1"
    );

    expect(capabilityService.invoke).toHaveBeenCalledTimes(1);
    expect(capabilityService.invoke).toHaveBeenCalledWith(
      "video-planning",
      expect.objectContaining({
        durationMs: 12500,
        width: 1920,
        height: 1080,
        videoFormat: "mp4",
        prompt: "remove the silence and make it vertical",
        correctionNotice: "",
      }),
      { expectJson: true },
      "user-1"
    );
    expect(workflowPlanRepository.create).toHaveBeenCalledWith({
      projectId: "proj-1",
      videoAssetId: "video-1",
      prompt: "remove the silence and make it vertical",
      workflow: VALID_WORKFLOW,
      model: "qwen2.5-coder:7b",
      createdBy: "user-1",
    });
    expect(result).toEqual({ id: "plan-1" });
  });

  it("retries once when the first attempt is not valid JSON (SCHEMA_INVALID), then succeeds", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ output: "not json at all", outputJson: undefined, model: "qwen2.5-coder:7b", provider: "ollama", outcome: "SCHEMA_INVALID" })
      .mockResolvedValueOnce(validInvokeResult());

    const { service, workflowPlanRepository } = buildService({
      capabilityService: createCapabilityService({ invoke }),
    });

    const result = await service.plan(
      { videoAssetId: "video-1", prompt: "prompt" },
      "user-1"
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: "plan-1" });

    // The second attempt's input carries the prior bad output and the error.
    const secondInput = invoke.mock.calls[1][1];
    expect(secondInput.correctionNotice).toContain("not json at all");
    expect(secondInput.correctionNotice).toContain("Your previous response was invalid");
  });

  it("retries once on a validation failure (unknown operation), then succeeds", async () => {
    const invalidWorkflow = { steps: [{ operation: "delete_everything", params: {} }] };
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(validInvokeResult({ output: JSON.stringify(invalidWorkflow), outputJson: invalidWorkflow }))
      .mockResolvedValueOnce(validInvokeResult());

    const { service, workflowPlanRepository } = buildService({
      capabilityService: createCapabilityService({ invoke }),
    });

    await service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1");

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).toHaveBeenCalledTimes(1);
  });

  it("regenerates when the AI proposes an operation outside the executable set (blur_faces), then succeeds", async () => {
    // blur_faces is a real operation the AI planner used to be able to
    // return (it was schema-valid but had no execution path) — this is the
    // exact regression this fix closes: the plan step now fails Zod
    // validation the same as any other malformed response, so the
    // service's existing one-shot corrective retry handles it without any
    // new code path.
    const unsupportedOpWorkflow = { steps: [{ operation: "blur_faces", params: {} }] };
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(validInvokeResult({ output: JSON.stringify(unsupportedOpWorkflow), outputJson: unsupportedOpWorkflow }))
      .mockResolvedValueOnce(validInvokeResult());

    const { service, workflowPlanRepository } = buildService({
      capabilityService: createCapabilityService({ invoke }),
    });

    const result = await service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1");

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workflow: VALID_WORKFLOW })
    );
    expect(result).toEqual({ id: "plan-1" });
  });

  it("gives up and throws WorkflowPlanningFailedError when the AI keeps proposing unsupported operations", async () => {
    const unsupportedOpWorkflow = { steps: [{ operation: "auto_zoom", params: {} }] };
    const invoke = vi
      .fn()
      .mockResolvedValue(validInvokeResult({ output: JSON.stringify(unsupportedOpWorkflow), outputJson: unsupportedOpWorkflow }));

    const { service, workflowPlanRepository } = buildService({
      capabilityService: createCapabilityService({ invoke }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(WorkflowPlanningFailedError);

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).not.toHaveBeenCalled();
  });

  it("throws WorkflowPlanningFailedError after two failed attempts and never persists", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValue({ output: "still not json", outputJson: undefined, model: "qwen2.5-coder:7b", provider: "ollama", outcome: "SCHEMA_INVALID" });

    const { service, capabilityService, workflowPlanRepository } = buildService({
      capabilityService: createCapabilityService({ invoke }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(WorkflowPlanningFailedError);

    expect(capabilityService.invoke).toHaveBeenCalledTimes(2);
    expect(workflowPlanRepository.create).not.toHaveBeenCalled();
  });

  it("throws a 503 ApiError immediately (no retry) on a TRANSIENT_FAILURE outcome", async () => {
    const invoke = vi.fn().mockResolvedValue({
      output: "",
      outputJson: undefined,
      model: "qwen2.5-coder:7b",
      provider: "ollama",
      outcome: "TRANSIENT_FAILURE",
    });

    const { service, workflowPlanRepository } = buildService({
      capabilityService: createCapabilityService({ invoke }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(ApiError);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(workflowPlanRepository.create).not.toHaveBeenCalled();
  });

  it("throws a 503 ApiError immediately (no retry) on a DEFINITIVE_FAILURE outcome", async () => {
    const invoke = vi.fn().mockResolvedValue({
      output: "",
      outputJson: undefined,
      model: "qwen2.5-coder:7b",
      provider: "ollama",
      outcome: "DEFINITIVE_FAILURE",
    });

    const { service } = buildService({
      capabilityService: createCapabilityService({ invoke }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(ApiError);

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundError and never calls the AI Capability when the video asset doesn't exist", async () => {
    const { service, capabilityService } = buildService({
      videoAssetRepository: createVideoAssetRepository({ findById: vi.fn().mockResolvedValue(null) }),
    });

    await expect(
      service.plan({ videoAssetId: "missing", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(NotFoundError);

    expect(capabilityService.invoke).not.toHaveBeenCalled();
  });

  it("throws InvalidWorkflowSourceError for a non-UPLOADED_SOURCE video asset and never calls the AI Capability", async () => {
    const { service, capabilityService } = buildService({
      videoAssetRepository: createVideoAssetRepository({
        findById: vi.fn().mockResolvedValue({ ...VALID_VIDEO_ASSET, kind: "SCRIPT" }),
      }),
    });

    await expect(
      service.plan({ videoAssetId: "video-1", prompt: "prompt" }, "user-1")
    ).rejects.toThrow(InvalidWorkflowSourceError);

    expect(capabilityService.invoke).not.toHaveBeenCalled();
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

import { beforeEach, describe, expect, it, vi } from "vitest";

const { copyFileMock, mkdirMock, rmMock, writeFileMock, probeVideoFileMock } = vi.hoisted(() => ({
  copyFileMock: vi.fn().mockResolvedValue(undefined),
  mkdirMock: vi.fn().mockResolvedValue(undefined),
  rmMock: vi.fn().mockResolvedValue(undefined),
  writeFileMock: vi.fn().mockResolvedValue(undefined),
  probeVideoFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  copyFile: copyFileMock,
  mkdir: mkdirMock,
  rm: rmMock,
  writeFile: writeFileMock,
}));

vi.mock("../utils/ffprobe.util.js", () => ({
  probeVideoFile: probeVideoFileMock,
}));

import { VideoExecutionEngineService } from "./video-execution-engine.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  InvalidWorkflowPlanError,
  VideoExecutionFailedError,
} from "../errors/video-execution.error.js";

const VALID_PLAN = {
  id: "plan-1",
  projectId: "proj-1",
  videoAssetId: "video-1",
  prompt: "remove silence and resize to 9:16",
  workflow: {
    steps: [
      { operation: "remove_silence", params: {} },
      { operation: "resize", params: { aspectRatio: "9:16" } },
    ],
  },
  model: "qwen2.5-coder:7b",
  createdBy: "user-1",
};

const SOURCE_ASSET = {
  id: "video-1",
  projectId: "proj-1",
  videoGroupId: "group-1",
  kind: "UPLOADED_SOURCE",
  storagePath: "proj-1/uuid.mp4",
  sourceFileName: "my-video.mp4",
};

const VALID_PROBE = {
  durationMs: 9000,
  width: 1080,
  height: 1920,
  videoCodec: "h264",
  containerFormat: "mp4",
  hasAudio: true,
};

function createWorkflowPlanRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(VALID_PLAN),
    markExecuted: vi.fn().mockResolvedValue({ id: "plan-1" }),
    ...overrides,
  };
}

function createVideoAssetRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(SOURCE_ASSET),
    create: vi.fn().mockResolvedValue({ id: "video-2" }),
    ...overrides,
  };
}

function createStorageProvider(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getAbsolutePath: vi.fn().mockReturnValue("/storage/proj-1/uuid.mp4"),
    save: vi.fn().mockResolvedValue({ path: "proj-1/edited.mp4", url: "/u/edited.mp4", bytes: 1000 }),
    delete: vi.fn().mockResolvedValue(undefined),
    getUrl: vi.fn().mockReturnValue("/u/edited.mp4"),
    ...overrides,
  };
}

function createFfmpegProvider(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    isSupported: vi.fn((op: string) =>
      ["trim", "remove_silence", "normalize_audio", "resize", "brightness"].includes(op)
    ),
    run: vi.fn().mockResolvedValue(undefined),
    extractAudio: vi.fn().mockResolvedValue(undefined),
    burnSubtitles: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAnalyticsEventRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: vi.fn().mockResolvedValue({ id: "event-1" }),
    ...overrides,
  };
}

function createWhisperProvider(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    transcribe: vi.fn().mockResolvedValue([{ start: 0, end: 1.5, text: "hello world" }]),
    buildSrt: vi.fn().mockReturnValue("1\n00:00:00,000 --> 00:00:01,500\nhello world\n"),
    ...overrides,
  };
}

describe("VideoExecutionEngineService.execute", () => {
  beforeEach(() => {
    copyFileMock.mockClear();
    mkdirMock.mockClear();
    rmMock.mockClear();
    writeFileMock.mockClear();
    probeVideoFileMock.mockReset();
    probeVideoFileMock.mockResolvedValue(VALID_PROBE);
  });

  function buildService(overrides?: {
    workflowPlanRepository?: ReturnType<typeof createWorkflowPlanRepository>;
    videoAssetRepository?: ReturnType<typeof createVideoAssetRepository>;
    storageProvider?: ReturnType<typeof createStorageProvider>;
    ffmpegProvider?: ReturnType<typeof createFfmpegProvider>;
    analyticsEventRepository?: ReturnType<typeof createAnalyticsEventRepository>;
    whisperProvider?: ReturnType<typeof createWhisperProvider>;
  }) {
    const workflowPlanRepository = overrides?.workflowPlanRepository ?? createWorkflowPlanRepository();
    const videoAssetRepository = overrides?.videoAssetRepository ?? createVideoAssetRepository();
    const storageProvider = overrides?.storageProvider ?? createStorageProvider();
    const ffmpegProvider = overrides?.ffmpegProvider ?? createFfmpegProvider();
    const analyticsEventRepository =
      overrides?.analyticsEventRepository ?? createAnalyticsEventRepository();
    const whisperProvider = overrides?.whisperProvider ?? createWhisperProvider();

    const service = new VideoExecutionEngineService(
      workflowPlanRepository as never,
      videoAssetRepository as never,
      storageProvider as never,
      ffmpegProvider as never,
      analyticsEventRepository as never,
      whisperProvider as never
    );

    return {
      service,
      workflowPlanRepository,
      videoAssetRepository,
      storageProvider,
      ffmpegProvider,
      analyticsEventRepository,
      whisperProvider,
    };
  }

  it("executes every step sequentially, saves the result, and marks the plan executed", async () => {
    const { service, videoAssetRepository, storageProvider, ffmpegProvider, workflowPlanRepository } =
      buildService();

    const result = await service.execute({ workflowPlanId: "plan-1" }, "user-1");

    expect(ffmpegProvider.run).toHaveBeenCalledTimes(2);
    // Each step's output must feed the next step's input.
    const [firstCall, secondCall] = ffmpegProvider.run.mock.calls;
    expect(secondCall[1]).toBe(firstCall[2]);

    expect(storageProvider.save).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", extension: "mp4", sourcePath: secondCall[2] })
    );

    expect(videoAssetRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        videoGroupId: "group-1",
        kind: "EDITED_VIDEO",
        provider: "ffmpeg",
        storagePath: "proj-1/edited.mp4",
        status: "COMPLETED",
        durationMs: 9000,
        videoFormat: "mp4",
        sourceFileName: "edited-my-video.mp4",
      })
    );

    expect(workflowPlanRepository.markExecuted).toHaveBeenCalledWith("plan-1", "video-2");
    expect(result).toEqual({ id: "video-2" });
  });

  it("copies (never moves) the source file, leaving the original untouched", async () => {
    const { service, storageProvider } = buildService();

    await service.execute({ workflowPlanId: "plan-1" }, "user-1");

    expect(storageProvider.getAbsolutePath).toHaveBeenCalledWith("proj-1/uuid.mp4");
    expect(copyFileMock).toHaveBeenCalledWith(
      "/storage/proj-1/uuid.mp4",
      expect.stringContaining("step-0-input.mp4")
    );
  });

  it("removes the temp working directory after a successful run", async () => {
    const { service } = buildService();

    await service.execute({ workflowPlanId: "plan-1" }, "user-1");

    expect(rmMock).toHaveBeenCalledWith(
      expect.stringContaining("execute-"),
      { recursive: true, force: true }
    );
  });

  it("records a fire-and-forget analytics event on success", async () => {
    const { service, analyticsEventRepository } = buildService();

    await service.execute({ workflowPlanId: "plan-1" }, "user-1");
    await Promise.resolve();

    expect(analyticsEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj-1",
        assetType: "VIDEO",
        sourceId: "video-2",
        type: "GENERATED",
        provider: "ffmpeg",
      })
    );
  });

  it("throws NotFoundError when the plan doesn't exist or isn't owned by the user", async () => {
    const { service, videoAssetRepository } = buildService({
      workflowPlanRepository: createWorkflowPlanRepository({ findById: vi.fn().mockResolvedValue(null) }),
    });

    await expect(service.execute({ workflowPlanId: "missing" }, "user-1")).rejects.toThrow(
      NotFoundError
    );
    expect(videoAssetRepository.findById).not.toHaveBeenCalled();
  });

  it("throws InvalidWorkflowPlanError when the stored workflow fails re-validation", async () => {
    const { service, videoAssetRepository } = buildService({
      workflowPlanRepository: createWorkflowPlanRepository({
        findById: vi.fn().mockResolvedValue({ ...VALID_PLAN, workflow: { steps: "not-an-array" } }),
      }),
    });

    await expect(service.execute({ workflowPlanId: "plan-1" }, "user-1")).rejects.toThrow(
      InvalidWorkflowPlanError
    );
    expect(videoAssetRepository.findById).not.toHaveBeenCalled();
  });

  it("throws InvalidWorkflowPlanError for a plan containing an operation outside the executable set and never runs ffmpeg", async () => {
    // "blur_faces" isn't in WorkflowStepSchema's discriminated union
    // (backend/src/validators/video-workflow-plan.validator.ts) — a plan
    // can only end up storing it if it predates the shared
    // EXECUTABLE_OPERATIONS restriction, so re-validation rejects the
    // whole workflow rather than a per-step "unsupported operation" check.
    const { service, ffmpegProvider, videoAssetRepository } = buildService({
      workflowPlanRepository: createWorkflowPlanRepository({
        findById: vi.fn().mockResolvedValue({
          ...VALID_PLAN,
          workflow: { steps: [{ operation: "blur_faces", params: {} }] },
        }),
      }),
    });

    await expect(service.execute({ workflowPlanId: "plan-1" }, "user-1")).rejects.toThrow(
      InvalidWorkflowPlanError
    );
    expect(ffmpegProvider.run).not.toHaveBeenCalled();
    expect(videoAssetRepository.findById).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the source video no longer exists", async () => {
    const { service } = buildService({
      videoAssetRepository: createVideoAssetRepository({ findById: vi.fn().mockResolvedValue(null) }),
    });

    await expect(service.execute({ workflowPlanId: "plan-1" }, "user-1")).rejects.toThrow(
      NotFoundError
    );
  });

  it("stops immediately, cleans up, and never creates a VideoAsset when a step fails", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("ffmpeg exited with code 1"));

    const { service, videoAssetRepository, workflowPlanRepository } = buildService({
      ffmpegProvider: createFfmpegProvider({ run }),
    });

    await expect(service.execute({ workflowPlanId: "plan-1" }, "user-1")).rejects.toThrow(
      VideoExecutionFailedError
    );

    expect(run).toHaveBeenCalledTimes(2);
    expect(videoAssetRepository.create).not.toHaveBeenCalled();
    expect(workflowPlanRepository.markExecuted).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledWith(
      expect.stringContaining("execute-"),
      { recursive: true, force: true }
    );
  });

  describe("subtitles step", () => {
    const SUBTITLES_PLAN = {
      ...VALID_PLAN,
      workflow: {
        steps: [
          { operation: "trim", params: { startSec: 0, endSec: 5 } },
          { operation: "subtitles", params: { language: "auto" } },
        ],
      },
    };

    it("extracts audio, transcribes, writes an SRT, burns it in, and persists subtitlePath", async () => {
      const { service, ffmpegProvider, whisperProvider, storageProvider, videoAssetRepository } =
        buildService({
          workflowPlanRepository: createWorkflowPlanRepository({
            findById: vi.fn().mockResolvedValue(SUBTITLES_PLAN),
          }),
          storageProvider: createStorageProvider({
            save: vi
              .fn()
              .mockResolvedValueOnce({ path: "proj-1/edited.mp4", url: "/u/edited.mp4", bytes: 1000 })
              .mockResolvedValueOnce({ path: "proj-1/edited.srt", url: "/u/edited.srt", bytes: 40 }),
          }),
        });

      const result = await service.execute({ workflowPlanId: "plan-1" }, "user-1");

      expect(ffmpegProvider.run).toHaveBeenCalledTimes(1);
      expect(ffmpegProvider.extractAudio).toHaveBeenCalledTimes(1);
      expect(whisperProvider.transcribe).toHaveBeenCalledWith(
        expect.stringContaining("-audio.wav"),
        "auto"
      );
      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining("-subtitles.srt"),
        expect.stringContaining("hello world"),
        "utf8"
      );
      expect(ffmpegProvider.burnSubtitles).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("-subtitles.srt"),
        expect.any(String)
      );

      expect(storageProvider.save).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj-1", extension: "srt" })
      );
      expect(videoAssetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ subtitlePath: "proj-1/edited.srt" })
      );
      expect(result).toEqual({ id: "video-2" });
    });

    it("stops with VideoExecutionFailedError when the source has no audio track", async () => {
      const { service, ffmpegProvider, videoAssetRepository } = buildService({
        workflowPlanRepository: createWorkflowPlanRepository({
          findById: vi.fn().mockResolvedValue({
            ...VALID_PLAN,
            workflow: { steps: [{ operation: "subtitles", params: { language: "auto" } }] },
          }),
        }),
      });

      probeVideoFileMock.mockResolvedValueOnce({ ...VALID_PROBE, hasAudio: false });

      await expect(service.execute({ workflowPlanId: "plan-1" }, "user-1")).rejects.toThrow(
        VideoExecutionFailedError
      );
      expect(ffmpegProvider.extractAudio).not.toHaveBeenCalled();
      expect(videoAssetRepository.create).not.toHaveBeenCalled();
    });

    it("stops with VideoExecutionFailedError when no speech is detected", async () => {
      const { service, videoAssetRepository } = buildService({
        workflowPlanRepository: createWorkflowPlanRepository({
          findById: vi.fn().mockResolvedValue({
            ...VALID_PLAN,
            workflow: { steps: [{ operation: "subtitles", params: { language: "auto" } }] },
          }),
        }),
        whisperProvider: createWhisperProvider({ transcribe: vi.fn().mockResolvedValue([]) }),
      });

      await expect(service.execute({ workflowPlanId: "plan-1" }, "user-1")).rejects.toThrow(
        VideoExecutionFailedError
      );
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(videoAssetRepository.create).not.toHaveBeenCalled();
    });

    it("cleans up the temp directory even when the subtitles step fails", async () => {
      const { service } = buildService({
        workflowPlanRepository: createWorkflowPlanRepository({
          findById: vi.fn().mockResolvedValue({
            ...VALID_PLAN,
            workflow: { steps: [{ operation: "subtitles", params: { language: "auto" } }] },
          }),
        }),
        whisperProvider: createWhisperProvider({ transcribe: vi.fn().mockResolvedValue([]) }),
      });

      await expect(service.execute({ workflowPlanId: "plan-1" }, "user-1")).rejects.toThrow(
        VideoExecutionFailedError
      );
      expect(rmMock).toHaveBeenCalledWith(
        expect.stringContaining("execute-"),
        { recursive: true, force: true }
      );
    });

    it("leaves subtitlePath null when the plan has no subtitles step", async () => {
      const { service, videoAssetRepository, storageProvider } = buildService();

      await service.execute({ workflowPlanId: "plan-1" }, "user-1");

      expect(storageProvider.save).toHaveBeenCalledTimes(1);
      expect(videoAssetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ subtitlePath: null })
      );
    });
  });
});

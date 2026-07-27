import { beforeEach, describe, expect, it, vi } from "vitest";

const submitPromptMock = vi.fn();
const getHistoryMock = vi.fn();
const downloadImageMock = vi.fn();
const checkReachableMock = vi.fn();
const clientConstructorMock = vi.fn();

vi.mock("./comfyui.client.js", () => ({
  ComfyUIClient: class {
    constructor(baseURL: string) {
      clientConstructorMock(baseURL);
    }

    submitPrompt = submitPromptMock;
    getHistory = getHistoryMock;
    downloadImage = downloadImageMock;
    checkReachable = checkReachableMock;
  },
}));

const loadWorkflowTemplateMock = vi.fn();

vi.mock("./workflow.loader.js", () => ({
  loadWorkflowTemplate: loadWorkflowTemplateMock,
}));

vi.mock("../../lib/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../config/env.js", () => ({
  env: {
    comfyuiUrl: "http://127.0.0.1:8188",
    comfyuiWorkflow: "sdxl",
    comfyuiTimeout: 5_000,
    comfyuiPollInterval: 1,
  },
}));

const { env } = await import("../../config/env.js");
const { logger } = await import("../../lib/logger.js");
const {
  ComfyUIProvider,
  validateComfyUIProviderConfig,
  checkComfyUIHealth,
  logComfyUIHealthCheck,
} = await import("./comfyui.provider.js");

type MutableEnv = {
  comfyuiUrl: string;
  comfyuiWorkflow: string;
  comfyuiTimeout: number;
  comfyuiPollInterval: number;
};

const baseTemplate = {
  "3": { class_type: "KSampler", inputs: { seed: "{{SEED}}" } },
};

const request = {
  prompt: "a lighthouse at sunset",
  width: 1024,
  height: 768,
  format: "png" as const,
};

function completedHistoryEntry(filename: string) {
  return {
    status: { status_str: "success", completed: true },
    outputs: { "9": { images: [{ filename, subfolder: "", type: "output" }] } },
  };
}

describe("ComfyUIProvider", () => {
  beforeEach(() => {
    submitPromptMock.mockReset();
    getHistoryMock.mockReset();
    downloadImageMock.mockReset();
    checkReachableMock.mockReset();
    clientConstructorMock.mockClear();
    loadWorkflowTemplateMock.mockReset();
    vi.mocked(logger.info).mockClear();
    vi.mocked(logger.warn).mockClear();

    loadWorkflowTemplateMock.mockReturnValue(baseTemplate);
    (env as MutableEnv).comfyuiUrl = "http://127.0.0.1:8188";
    (env as MutableEnv).comfyuiWorkflow = "sdxl";
    (env as MutableEnv).comfyuiTimeout = 5_000;
    (env as MutableEnv).comfyuiPollInterval = 1;
  });

  it("is registered under the name 'comfyui'", () => {
    expect(new ComfyUIProvider().name).toBe("comfyui");
  });

  it("authenticates the underlying client against the configured ComfyUI URL", () => {
    new ComfyUIProvider();

    expect(clientConstructorMock).toHaveBeenCalledWith("http://127.0.0.1:8188");
  });

  it("generates an image end-to-end: submit -> poll -> download", async () => {
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock.mockResolvedValueOnce(completedHistoryEntry("out_00001_.png"));
    downloadImageMock.mockResolvedValueOnce(Buffer.from("fake-bytes"));

    const provider = new ComfyUIProvider();
    const result = await provider.generate(request);

    expect(result).toEqual({
      buffer: Buffer.from("fake-bytes"),
      model: "sdxl",
      width: 1024,
      height: 768,
      format: "png",
    });
    expect(downloadImageMock).toHaveBeenCalledWith({
      filename: "out_00001_.png",
      subfolder: "",
      type: "output",
    });
  });

  it("polls repeatedly until the image is ready", async () => {
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ status: { completed: false }, outputs: {} })
      .mockResolvedValueOnce(completedHistoryEntry("out.png"));
    downloadImageMock.mockResolvedValueOnce(Buffer.from("x"));

    const provider = new ComfyUIProvider();
    await provider.generate(request);

    expect(getHistoryMock).toHaveBeenCalledTimes(3);
  });

  it("derives the output format from the returned filename's extension", async () => {
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock.mockResolvedValueOnce(completedHistoryEntry("out.jpeg"));
    downloadImageMock.mockResolvedValueOnce(Buffer.from("x"));

    const provider = new ComfyUIProvider();
    const result = await provider.generate(request);

    expect(result.format).toBe("jpg");
  });

  it("falls back to the requested format when the filename extension is unrecognized", async () => {
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock.mockResolvedValueOnce(completedHistoryEntry("out.tiff"));
    downloadImageMock.mockResolvedValueOnce(Buffer.from("x"));

    const provider = new ComfyUIProvider();
    const result = await provider.generate(request);

    expect(result.format).toBe("png");
  });

  it("throws when ComfyUI rejects the workflow (non-empty node_errors)", async () => {
    submitPromptMock.mockResolvedValueOnce({
      prompt_id: "p1",
      node_errors: { "4": { errors: [{ message: "value_not_in_list" }] } },
    });

    const provider = new ComfyUIProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /rejected workflow "sdxl"/
    );
  });

  it("throws when ComfyUI's response has no prompt_id", async () => {
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "" });

    const provider = new ComfyUIProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /did not return a prompt_id/
    );
  });

  it("throws when history reports a generation error", async () => {
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock.mockResolvedValueOnce({
      status: { status_str: "error", completed: true },
      outputs: {},
    });

    const provider = new ComfyUIProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /reported a generation error/
    );
  });

  it("throws when the prompt completes with no output image", async () => {
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock.mockResolvedValueOnce({
      status: { status_str: "success", completed: true },
      outputs: {},
    });

    const provider = new ComfyUIProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /produced no output image/
    );
  });

  it("times out if the generation never completes within COMFYUI_TIMEOUT", async () => {
    (env as MutableEnv).comfyuiTimeout = 10;
    (env as MutableEnv).comfyuiPollInterval = 3;

    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock.mockResolvedValue(undefined);

    const provider = new ComfyUIProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /timed out after/
    );
  });

  it("lets a download failure propagate unwrapped, for ImageService's own stage-based handling", async () => {
    const downloadError = new Error("GET /view failed with 404");
    submitPromptMock.mockResolvedValueOnce({ prompt_id: "p1", node_errors: {} });
    getHistoryMock.mockResolvedValueOnce(completedHistoryEntry("out.png"));
    downloadImageMock.mockRejectedValueOnce(downloadError);

    const provider = new ComfyUIProvider();

    await expect(provider.generate(request)).rejects.toBe(downloadError);
  });

  it("lets a submission network failure propagate unwrapped", async () => {
    const networkError = new Error("connect ECONNREFUSED");
    submitPromptMock.mockRejectedValueOnce(networkError);

    const provider = new ComfyUIProvider();

    await expect(provider.generate(request)).rejects.toBe(networkError);
  });
});

describe("validateComfyUIProviderConfig", () => {
  beforeEach(() => {
    loadWorkflowTemplateMock.mockReset();
    loadWorkflowTemplateMock.mockReturnValue(baseTemplate);
    (env as MutableEnv).comfyuiUrl = "http://127.0.0.1:8188";
    (env as MutableEnv).comfyuiWorkflow = "sdxl";
    (env as MutableEnv).comfyuiTimeout = 5_000;
    (env as MutableEnv).comfyuiPollInterval = 1;
  });

  it("does not throw for a valid configuration", () => {
    expect(() => validateComfyUIProviderConfig()).not.toThrow();
  });

  it("throws when COMFYUI_URL is empty", () => {
    (env as MutableEnv).comfyuiUrl = "";

    expect(() => validateComfyUIProviderConfig()).toThrow(/COMFYUI_URL is not configured/);
  });

  it("throws when COMFYUI_WORKFLOW is empty", () => {
    (env as MutableEnv).comfyuiWorkflow = "";

    expect(() => validateComfyUIProviderConfig()).toThrow(
      /COMFYUI_WORKFLOW is not configured/
    );
  });

  it("throws when COMFYUI_TIMEOUT is not positive", () => {
    (env as MutableEnv).comfyuiTimeout = 0;

    expect(() => validateComfyUIProviderConfig()).toThrow(/COMFYUI_TIMEOUT must be/);
  });

  it("throws when COMFYUI_POLL_INTERVAL is not positive", () => {
    (env as MutableEnv).comfyuiPollInterval = -1;

    expect(() => validateComfyUIProviderConfig()).toThrow(
      /COMFYUI_POLL_INTERVAL must be/
    );
  });

  it("throws when the configured workflow template doesn't exist or parse", () => {
    loadWorkflowTemplateMock.mockImplementation(() => {
      throw new Error('ComfyUI workflow template "sdxl" was not found');
    });

    expect(() => validateComfyUIProviderConfig()).toThrow(/was not found/);
  });
});

describe("checkComfyUIHealth", () => {
  beforeEach(() => {
    checkReachableMock.mockReset();
    loadWorkflowTemplateMock.mockReset();
    loadWorkflowTemplateMock.mockReturnValue(baseTemplate);
    (env as MutableEnv).comfyuiUrl = "http://127.0.0.1:8188";
    (env as MutableEnv).comfyuiWorkflow = "sdxl";
    (env as MutableEnv).comfyuiTimeout = 5_000;
    (env as MutableEnv).comfyuiPollInterval = 1;
  });

  it("reports reachable when ComfyUI responds", async () => {
    checkReachableMock.mockResolvedValueOnce(undefined);

    const result = await checkComfyUIHealth();

    expect(result).toEqual({ reachable: true, configValid: true });
  });

  it("reports unreachable, but configValid, when ComfyUI doesn't respond", async () => {
    checkReachableMock.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const result = await checkComfyUIHealth();

    expect(result.reachable).toBe(false);
    expect(result.configValid).toBe(true);
    expect(result.detail).toMatch(/ECONNREFUSED/);
  });

  it("reports configValid: false without attempting a network call when config is invalid", async () => {
    (env as MutableEnv).comfyuiUrl = "";

    const result = await checkComfyUIHealth();

    expect(result).toEqual({
      reachable: false,
      configValid: false,
      detail: expect.stringContaining("COMFYUI_URL is not configured"),
    });
    expect(checkReachableMock).not.toHaveBeenCalled();
  });
});

describe("logComfyUIHealthCheck", () => {
  beforeEach(() => {
    checkReachableMock.mockReset();
    loadWorkflowTemplateMock.mockReset();
    loadWorkflowTemplateMock.mockReturnValue(baseTemplate);
    vi.mocked(logger.info).mockClear();
    vi.mocked(logger.warn).mockClear();
    (env as MutableEnv).comfyuiUrl = "http://127.0.0.1:8188";
    (env as MutableEnv).comfyuiWorkflow = "sdxl";
  });

  it("logs an info line when healthy", async () => {
    checkReachableMock.mockResolvedValueOnce(undefined);

    logComfyUIHealthCheck();
    await vi.waitFor(() => expect(logger.info).toHaveBeenCalled());

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Health check passed")
    );
  });

  it("logs a warning line when unreachable, without throwing", async () => {
    checkReachableMock.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    expect(() => logComfyUIHealthCheck()).not.toThrow();
    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Health check failed")
    );
  });
});

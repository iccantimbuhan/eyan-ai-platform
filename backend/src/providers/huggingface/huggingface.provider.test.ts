import { beforeEach, describe, expect, it, vi } from "vitest";

const generateImageMock = vi.fn();
const checkAuthMock = vi.fn();
const checkModelAvailableMock = vi.fn();
const clientConstructorMock = vi.fn();

vi.mock("./huggingface.client.js", () => ({
  HuggingFaceClient: class {
    constructor(baseURL: string, apiKey: string, timeoutMs: number) {
      clientConstructorMock(baseURL, apiKey, timeoutMs);
    }

    generateImage = generateImageMock;
    checkAuth = checkAuthMock;
    checkModelAvailable = checkModelAvailableMock;
  },
}));

vi.mock("../../lib/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../config/env.js", () => ({
  env: {
    huggingfaceApiKey: "hf_test_key",
    huggingfaceModel: "black-forest-labs/FLUX.1-schnell",
    huggingfaceBaseUrl: "https://router.huggingface.co/hf-inference",
    huggingfaceTimeout: 60_000,
  },
}));

const { env } = await import("../../config/env.js");
const { logger } = await import("../../lib/logger.js");
const {
  HuggingFaceProvider,
  validateHuggingFaceProviderConfig,
  checkHuggingFaceHealth,
  logHuggingFaceHealthCheck,
} = await import("./huggingface.provider.js");

type MutableEnv = {
  huggingfaceApiKey: string;
  huggingfaceModel: string;
  huggingfaceBaseUrl: string;
  huggingfaceTimeout: number;
};

const request = {
  prompt: "a lighthouse at sunset",
  width: 1024,
  height: 768,
  format: "png" as const,
};

function resetEnv() {
  (env as MutableEnv).huggingfaceApiKey = "hf_test_key";
  (env as MutableEnv).huggingfaceModel = "black-forest-labs/FLUX.1-schnell";
  (env as MutableEnv).huggingfaceBaseUrl = "https://router.huggingface.co/hf-inference";
  (env as MutableEnv).huggingfaceTimeout = 60_000;
}

describe("HuggingFaceProvider", () => {
  beforeEach(() => {
    generateImageMock.mockReset();
    checkAuthMock.mockReset();
    checkModelAvailableMock.mockReset();
    clientConstructorMock.mockClear();
    vi.mocked(logger.debug).mockClear();
    resetEnv();
  });

  it("is registered under the name 'huggingface'", () => {
    expect(new HuggingFaceProvider().name).toBe("huggingface");
  });

  it("authenticates the client against the configured base URL, API key, and timeout", () => {
    new HuggingFaceProvider();

    expect(clientConstructorMock).toHaveBeenCalledWith(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );
  });

  it("generates an image successfully", async () => {
    generateImageMock.mockResolvedValueOnce({
      buffer: Buffer.from("fake-png-bytes"),
      contentType: "image/png",
    });

    const provider = new HuggingFaceProvider();
    const result = await provider.generate(request);

    expect(result).toEqual({
      buffer: Buffer.from("fake-png-bytes"),
      model: "black-forest-labs/FLUX.1-schnell",
      width: 1024,
      height: 768,
      format: "png",
    });
  });

  it("sends the prompt, negative prompt, dimensions, and a generated seed", async () => {
    generateImageMock.mockResolvedValueOnce({
      buffer: Buffer.from("x"),
      contentType: "image/png",
    });

    const provider = new HuggingFaceProvider();
    await provider.generate({ ...request, negativePrompt: "blurry" });

    expect(generateImageMock).toHaveBeenCalledWith(
      "black-forest-labs/FLUX.1-schnell",
      {
        inputs: "a lighthouse at sunset",
        parameters: expect.objectContaining({
          negative_prompt: "blurry",
          width: 1024,
          height: 768,
          seed: expect.any(Number),
        }),
      }
    );
  });

  it("throws a specific, sanitized-safe message for an invalid API key (401), not the raw HTTP error", async () => {
    const axiosLikeError = Object.assign(new Error("Request failed with status code 401"), {
      isAxiosError: true,
      response: {
        status: 401,
        data: Buffer.from(JSON.stringify({ error: "Invalid credentials" })),
      },
    });
    generateImageMock.mockRejectedValueOnce(axiosLikeError);

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /invalid or missing API key/
    );
  });

  it("throws a specific message for a 403 forbidden response", async () => {
    const axiosLikeError = Object.assign(new Error("Request failed with status code 403"), {
      isAxiosError: true,
      response: { status: 403, data: Buffer.from(JSON.stringify({ error: "Forbidden" })) },
    });
    generateImageMock.mockRejectedValueOnce(axiosLikeError);

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/forbidden/);
  });

  it("throws a specific message for a 429 rate limit response", async () => {
    const axiosLikeError = Object.assign(new Error("Request failed with status code 429"), {
      isAxiosError: true,
      response: { status: 429, data: Buffer.from(JSON.stringify({ error: "Rate limited" })) },
    });
    generateImageMock.mockRejectedValueOnce(axiosLikeError);

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/rate limit/);
  });

  it("throws a specific message for an unsupported/not-found model (404)", async () => {
    const axiosLikeError = Object.assign(new Error("Request failed with status code 404"), {
      isAxiosError: true,
      response: { status: 404, data: Buffer.from(JSON.stringify({ error: "Not Found" })) },
    });
    generateImageMock.mockRejectedValueOnce(axiosLikeError);

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /model not found or unsupported/
    );
  });

  it("throws a specific message for a timeout", async () => {
    const axiosLikeError = Object.assign(new Error("timeout of 60000ms exceeded"), {
      isAxiosError: true,
      code: "ECONNABORTED",
    });
    generateImageMock.mockRejectedValueOnce(axiosLikeError);

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/timed out/);
  });

  it("throws a specific message for a network failure", async () => {
    const axiosLikeError = Object.assign(new Error("connect ECONNREFUSED"), {
      isAxiosError: true,
      code: "ECONNREFUSED",
    });
    generateImageMock.mockRejectedValueOnce(axiosLikeError);

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/network error/);
  });

  it("never lets a raw Hugging Face error message reach the thrown error directly", async () => {
    const axiosLikeError = Object.assign(new Error("Request failed with status code 401"), {
      isAxiosError: true,
      response: {
        status: 401,
        data: Buffer.from(
          JSON.stringify({ error: "super-secret-internal-detail-xyz" })
        ),
      },
    });
    generateImageMock.mockRejectedValueOnce(axiosLikeError);

    const provider = new HuggingFaceProvider();

    // The raw HF detail is still present (for ImageService to log/persist to
    // the owner's errorMessage) but wrapped behind a clear, HF-aware prefix
    // rather than surfacing as an opaque native HTTP error.
    await expect(provider.generate(request)).rejects.toThrow(
      /invalid or missing API key.*super-secret-internal-detail-xyz/
    );
  });
});

describe("validateHuggingFaceProviderConfig", () => {
  beforeEach(() => {
    resetEnv();
  });

  it("does not throw for a valid configuration", () => {
    expect(() => validateHuggingFaceProviderConfig()).not.toThrow();
  });

  it("throws when HUGGINGFACE_API_KEY is empty", () => {
    (env as MutableEnv).huggingfaceApiKey = "";

    expect(() => validateHuggingFaceProviderConfig()).toThrow(
      /HUGGINGFACE_API_KEY is not configured/
    );
  });

  it("throws when HUGGINGFACE_MODEL is empty", () => {
    (env as MutableEnv).huggingfaceModel = "";

    expect(() => validateHuggingFaceProviderConfig()).toThrow(
      /HUGGINGFACE_MODEL is not configured/
    );
  });

  it("throws when HUGGINGFACE_MODEL is not a valid model id", () => {
    (env as MutableEnv).huggingfaceModel = "not-a-valid-model-id";

    expect(() => validateHuggingFaceProviderConfig()).toThrow(
      /is not a valid Hugging Face model id/
    );
  });

  it("throws when HUGGINGFACE_BASE_URL is empty", () => {
    (env as MutableEnv).huggingfaceBaseUrl = "";

    expect(() => validateHuggingFaceProviderConfig()).toThrow(
      /HUGGINGFACE_BASE_URL is not configured/
    );
  });

  it("throws when HUGGINGFACE_TIMEOUT is not positive", () => {
    (env as MutableEnv).huggingfaceTimeout = 0;

    expect(() => validateHuggingFaceProviderConfig()).toThrow(
      /HUGGINGFACE_TIMEOUT must be/
    );
  });
});

describe("checkHuggingFaceHealth", () => {
  beforeEach(() => {
    generateImageMock.mockReset();
    checkAuthMock.mockReset();
    checkModelAvailableMock.mockReset();
    resetEnv();
  });

  it("reports fully healthy when auth and model checks both succeed", async () => {
    checkAuthMock.mockResolvedValueOnce({ name: "test-user" });
    checkModelAvailableMock.mockResolvedValueOnce(undefined);

    const result = await checkHuggingFaceHealth();

    expect(result).toEqual({
      reachable: true,
      authValid: true,
      modelConfigured: true,
      configValid: true,
    });
  });

  it("does not generate an image during a health check", async () => {
    checkAuthMock.mockResolvedValueOnce({ name: "test-user" });
    checkModelAvailableMock.mockResolvedValueOnce(undefined);

    await checkHuggingFaceHealth();

    expect(generateImageMock).not.toHaveBeenCalled();
  });

  it("reports authValid: false when the token is rejected, without checking the model", async () => {
    checkAuthMock.mockRejectedValueOnce(
      Object.assign(new Error("401"), {
        isAxiosError: true,
        response: { status: 401, data: Buffer.from("{}") },
      })
    );

    const result = await checkHuggingFaceHealth();

    expect(result.reachable).toBe(true);
    expect(result.authValid).toBe(false);
    expect(result.modelConfigured).toBe(false);
    expect(checkModelAvailableMock).not.toHaveBeenCalled();
  });

  it("reports modelConfigured: false when the model check fails after a valid auth check", async () => {
    checkAuthMock.mockResolvedValueOnce({ name: "test-user" });
    checkModelAvailableMock.mockRejectedValueOnce(
      Object.assign(new Error("404"), {
        isAxiosError: true,
        response: { status: 404, data: Buffer.from("{}") },
      })
    );

    const result = await checkHuggingFaceHealth();

    expect(result.authValid).toBe(true);
    expect(result.modelConfigured).toBe(false);
  });

  it("reports configValid: false without any network call when configuration is invalid", async () => {
    (env as MutableEnv).huggingfaceApiKey = "";

    const result = await checkHuggingFaceHealth();

    expect(result).toEqual({
      reachable: false,
      authValid: false,
      modelConfigured: false,
      configValid: false,
      detail: expect.stringContaining("HUGGINGFACE_API_KEY is not configured"),
    });
    expect(checkAuthMock).not.toHaveBeenCalled();
  });
});

describe("logHuggingFaceHealthCheck", () => {
  beforeEach(() => {
    checkAuthMock.mockReset();
    checkModelAvailableMock.mockReset();
    vi.mocked(logger.info).mockClear();
    vi.mocked(logger.warn).mockClear();
    resetEnv();
  });

  it("logs an info line when fully healthy", async () => {
    checkAuthMock.mockResolvedValueOnce({ name: "test-user" });
    checkModelAvailableMock.mockResolvedValueOnce(undefined);

    logHuggingFaceHealthCheck();
    await vi.waitFor(() => expect(logger.info).toHaveBeenCalled());

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Health check passed")
    );
  });

  it("logs a warning, without throwing, when unhealthy", async () => {
    checkAuthMock.mockRejectedValueOnce(
      Object.assign(new Error("401"), {
        isAxiosError: true,
        response: { status: 401, data: Buffer.from("{}") },
      })
    );

    expect(() => logHuggingFaceHealthCheck()).not.toThrow();
    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Health check failed")
    );
  });
});

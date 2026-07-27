import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InferenceClientInputError,
  InferenceClientProviderApiError,
} from "@huggingface/inference";

const generateImageMock = vi.fn();
const checkAuthMock = vi.fn();
const checkModelAvailableMock = vi.fn();
const clientConstructorMock = vi.fn();

vi.mock("./huggingface.client.js", () => ({
  HuggingFaceClient: class {
    constructor(apiKey: string, timeoutMs: number, provider: string) {
      clientConstructorMock(apiKey, timeoutMs, provider);
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
    huggingfaceProvider: "auto",
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
  huggingfaceProvider: string;
  huggingfaceTimeout: number;
};

const request = {
  prompt: "a lighthouse at sunset",
  width: 1024,
  height: 768,
  format: "png" as const,
};

function providerApiError(
  status: number,
  body: Record<string, string | number>
): InferenceClientProviderApiError {
  return new InferenceClientProviderApiError(
    "Request failed",
    { url: "https://router.huggingface.co/hf-inference/models/org/model", method: "POST" },
    { requestId: "req-1", status, body }
  );
}

function resetEnv() {
  (env as MutableEnv).huggingfaceApiKey = "hf_test_key";
  (env as MutableEnv).huggingfaceModel = "black-forest-labs/FLUX.1-schnell";
  (env as MutableEnv).huggingfaceProvider = "auto";
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

  it("authenticates the client against the configured API key, timeout, and provider", () => {
    new HuggingFaceProvider();

    expect(clientConstructorMock).toHaveBeenCalledWith(
      "hf_test_key",
      60_000,
      "auto"
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

  it("throws a specific, sanitized-safe message for an invalid API key (401), not the raw provider error", async () => {
    generateImageMock.mockRejectedValueOnce(
      providerApiError(401, { error: "Invalid credentials" })
    );

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /invalid or missing API key/
    );
  });

  it("throws a specific message for a 403 forbidden response", async () => {
    generateImageMock.mockRejectedValueOnce(providerApiError(403, { error: "Forbidden" }));

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/forbidden/);
  });

  it("throws a specific message for a 429 rate limit response", async () => {
    generateImageMock.mockRejectedValueOnce(providerApiError(429, { error: "Rate limited" }));

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/rate limit/);
  });

  it("throws a specific message for an unsupported/not-found model (404)", async () => {
    generateImageMock.mockRejectedValueOnce(providerApiError(404, { error: "Not Found" }));

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /model not found or unsupported/
    );
  });

  it("throws a specific message when the SDK cannot route the model to any provider", async () => {
    generateImageMock.mockRejectedValueOnce(
      new InferenceClientInputError("No Inference Provider available for model org/model.")
    );

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(
      /could not be routed.*No Inference Provider available/
    );
  });

  it("throws a specific message for a timeout", async () => {
    const timeoutError = Object.assign(new Error("The operation timed out."), {
      name: "TimeoutError",
    });
    generateImageMock.mockRejectedValueOnce(timeoutError);

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/timed out/);
  });

  it("throws a specific message for a network failure", async () => {
    generateImageMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const provider = new HuggingFaceProvider();

    await expect(provider.generate(request)).rejects.toThrow(/network error/);
  });

  it("never lets a raw Hugging Face error message reach the thrown error directly", async () => {
    generateImageMock.mockRejectedValueOnce(
      providerApiError(401, { error: "super-secret-internal-detail-xyz" })
    );

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

  it("throws when HUGGINGFACE_PROVIDER is empty", () => {
    (env as MutableEnv).huggingfaceProvider = "";

    expect(() => validateHuggingFaceProviderConfig()).toThrow(
      /HUGGINGFACE_PROVIDER is not configured/
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

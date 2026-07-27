import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();
const googleGenAIConstructorMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: unknown) {
      googleGenAIConstructorMock(options);
    }

    models = { generateContent: generateContentMock };
  },
  Modality: { TEXT: "TEXT", IMAGE: "IMAGE" },
}));

vi.mock("../../config/env.js", () => ({
  env: { geminiApiKey: "test-api-key", geminiModel: "gemini-2.5-flash-image" },
}));

vi.mock("../../lib/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { env } = await import("../../config/env.js");
const { logger } = await import("../../lib/logger.js");
const {
  GeminiImageProvider,
  nearestSupportedAspectRatio,
  validateGeminiProviderConfig,
} = await import("./gemini-image.provider.js");

describe("GeminiImageProvider", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    googleGenAIConstructorMock.mockClear();
    vi.mocked(logger.debug).mockClear();
    (env as { geminiApiKey: string }).geminiApiKey = "test-api-key";
  });

  it("is registered under the name 'gemini'", () => {
    expect(new GeminiImageProvider().name).toBe("gemini");
  });

  it("authenticates the SDK client with the configured API key", () => {
    new GeminiImageProvider();

    expect(googleGenAIConstructorMock).toHaveBeenCalledWith({
      apiKey: "test-api-key",
    });
  });

  it("generates an image from a successful Gemini response", async () => {
    const base64Bytes = Buffer.from("fake-png-bytes").toString("base64");
    generateContentMock.mockResolvedValueOnce({ data: base64Bytes });

    const provider = new GeminiImageProvider();
    const result = await provider.generate({
      prompt: "A lighthouse at sunset",
      width: 1024,
      height: 1024,
      format: "png",
    });

    expect(result).toEqual({
      buffer: Buffer.from(base64Bytes, "base64"),
      model: "gemini-2.5-flash-image",
      width: 1024,
      height: 1024,
      format: "png",
    });
  });

  it("calls Gemini with the configured model, the prompt, and the nearest supported aspect ratio", async () => {
    generateContentMock.mockResolvedValueOnce({
      data: Buffer.from("x").toString("base64"),
    });

    const provider = new GeminiImageProvider();
    await provider.generate({
      prompt: "A wide banner image",
      width: 1920,
      height: 1080,
      format: "png",
    });

    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-2.5-flash-image",
      contents: "A wide banner image",
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "16:9" },
      },
    });
  });

  it("always reports the output format as png, regardless of the requested format", async () => {
    generateContentMock.mockResolvedValueOnce({
      data: Buffer.from("x").toString("base64"),
    });

    const provider = new GeminiImageProvider();
    const result = await provider.generate({
      prompt: "A cat",
      width: 512,
      height: 512,
      format: "webp",
    });

    expect(result.format).toBe("png");
  });

  it("ignores negativePrompt and logs that it isn't supported, without failing", async () => {
    generateContentMock.mockResolvedValueOnce({
      data: Buffer.from("x").toString("base64"),
    });

    const provider = new GeminiImageProvider();
    await provider.generate({
      prompt: "A cat",
      negativePrompt: "no dogs",
      width: 512,
      height: 512,
      format: "png",
    });

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({ contents: "A cat" })
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("negativePrompt was provided but is ignored")
    );
  });

  it("lets a raw Gemini API failure propagate unwrapped, for ImageService's own stage-based handling", async () => {
    const apiError = new Error("500 Internal Server Error from Gemini.");
    generateContentMock.mockRejectedValueOnce(apiError);

    const provider = new GeminiImageProvider();

    await expect(
      provider.generate({
        prompt: "A cat",
        width: 512,
        height: 512,
        format: "png",
      })
    ).rejects.toBe(apiError);
  });

  it("lets an invalid-API-key failure propagate unwrapped, with Gemini's own message intact", async () => {
    const invalidKeyError = new Error(
      "API key not valid. Please pass a valid API key."
    );
    generateContentMock.mockRejectedValueOnce(invalidKeyError);

    const provider = new GeminiImageProvider();

    await expect(
      provider.generate({
        prompt: "A cat",
        width: 512,
        height: 512,
        format: "png",
      })
    ).rejects.toThrow("API key not valid");
  });

  it("throws a clear error when the prompt was blocked (no image, blockReason present)", async () => {
    generateContentMock.mockResolvedValueOnce({
      data: undefined,
      promptFeedback: { blockReason: "SAFETY" },
    });

    const provider = new GeminiImageProvider();

    await expect(
      provider.generate({
        prompt: "something unsafe",
        width: 512,
        height: 512,
        format: "png",
      })
    ).rejects.toThrow(/blocked this prompt \(reason: SAFETY\)/);
  });

  it("throws a clear error when no image data and no candidate reached a normal stop", async () => {
    generateContentMock.mockResolvedValueOnce({
      data: undefined,
      candidates: [{ finishReason: "PROHIBITED_CONTENT" }],
    });

    const provider = new GeminiImageProvider();

    await expect(
      provider.generate({
        prompt: "something borderline",
        width: 512,
        height: 512,
        format: "png",
      })
    ).rejects.toThrow(/finish reason: PROHIBITED_CONTENT/);
  });

  it("throws a generic 'no image data' error when the response gives no other explanation", async () => {
    generateContentMock.mockResolvedValueOnce({ data: undefined });

    const provider = new GeminiImageProvider();

    await expect(
      provider.generate({
        prompt: "A cat",
        width: 512,
        height: 512,
        format: "png",
      })
    ).rejects.toThrow("Gemini returned no image data.");
  });
});

describe("nearestSupportedAspectRatio", () => {
  it("maps square dimensions to 1:1", () => {
    expect(nearestSupportedAspectRatio(512, 512)).toBe("1:1");
  });

  it("maps 1920x1080 to 16:9", () => {
    expect(nearestSupportedAspectRatio(1920, 1080)).toBe("16:9");
  });

  it("maps a tall portrait request to 9:16", () => {
    expect(nearestSupportedAspectRatio(1080, 1920)).toBe("9:16");
  });

  it("picks the closest ratio for a value that falls between two supported options", () => {
    // 700/500 = 1.4 — closer to 4:3 (1.333, diff 0.067) than 3:2 (1.5, diff 0.1).
    expect(nearestSupportedAspectRatio(700, 500)).toBe("4:3");
  });
});

describe("validateGeminiProviderConfig", () => {
  beforeEach(() => {
    (env as { geminiApiKey: string }).geminiApiKey = "";
  });

  it("throws a clear error when GEMINI_API_KEY is not configured", () => {
    expect(() => validateGeminiProviderConfig()).toThrow(
      /GEMINI_API_KEY is not configured/
    );
  });

  it("does not throw when GEMINI_API_KEY is configured", () => {
    (env as { geminiApiKey: string }).geminiApiKey = "test-api-key";

    expect(() => validateGeminiProviderConfig()).not.toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const createMock = vi.fn(() => ({ get: getMock }));

vi.mock("axios", () => ({
  default: { create: createMock },
}));

const textToImageMock = vi.fn();
const inferenceClientConstructorMock = vi.fn();

vi.mock("@huggingface/inference", () => ({
  InferenceClient: class {
    constructor(apiKey: string) {
      inferenceClientConstructorMock(apiKey);
    }

    textToImage = textToImageMock;
  },
}));

const { HuggingFaceClient } = await import("./huggingface.client.js");

describe("HuggingFaceClient", () => {
  beforeEach(() => {
    getMock.mockReset();
    createMock.mockClear();
    textToImageMock.mockReset();
    inferenceClientConstructorMock.mockClear();
  });

  it("constructs the official Inference SDK client with the given API key", () => {
    new HuggingFaceClient("hf_test_key", 60_000, "auto");

    expect(inferenceClientConstructorMock).toHaveBeenCalledWith("hf_test_key");
  });

  it("configures a separate Hub API client for health checks, capped at its own timeout", () => {
    new HuggingFaceClient("hf_test_key", 60_000, "auto");

    expect(createMock).toHaveBeenCalledWith({
      baseURL: "https://huggingface.co/api",
      timeout: 10_000,
      headers: { Authorization: "Bearer hf_test_key" },
    });
  });

  it("generates an image via the SDK's textToImage, passing model, provider, and request", async () => {
    const blob = new Blob([Buffer.from("fake-png-bytes")], { type: "image/png" });
    textToImageMock.mockResolvedValueOnce(blob);

    const client = new HuggingFaceClient("hf_test_key", 60_000, "auto");
    const result = await client.generateImage("org/model", { inputs: "a cat" });

    expect(textToImageMock).toHaveBeenCalledWith(
      { model: "org/model", provider: "auto", inputs: "a cat", parameters: undefined },
      { signal: expect.any(AbortSignal) }
    );
    expect(result.contentType).toBe("image/png");
    expect(Buffer.compare(result.buffer, Buffer.from(await blob.arrayBuffer()))).toBe(0);
  });

  it("passes the configured provider (not just 'auto') through to textToImage", async () => {
    textToImageMock.mockResolvedValueOnce(new Blob([Buffer.from("x")], { type: "image/png" }));

    const client = new HuggingFaceClient("hf_test_key", 60_000, "together");
    await client.generateImage("org/model", { inputs: "x" });

    expect(textToImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "together" }),
      expect.anything()
    );
  });

  it("forwards generation parameters unchanged", async () => {
    textToImageMock.mockResolvedValueOnce(new Blob([Buffer.from("x")], { type: "image/png" }));

    const client = new HuggingFaceClient("hf_test_key", 60_000, "auto");
    await client.generateImage("org/model", {
      inputs: "x",
      parameters: { negative_prompt: "blurry", width: 512, height: 512, seed: 42 },
    });

    expect(textToImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: { negative_prompt: "blurry", width: 512, height: 512, seed: 42 },
      }),
      expect.anything()
    );
  });

  it("defaults contentType to an empty string when the blob has no type", async () => {
    textToImageMock.mockResolvedValueOnce(new Blob([Buffer.from("x")]));

    const client = new HuggingFaceClient("hf_test_key", 60_000, "auto");
    const result = await client.generateImage("org/model", { inputs: "x" });

    expect(result.contentType).toBe("");
  });

  it("checks auth via GET /whoami-v2 on the Hub API client", async () => {
    getMock.mockResolvedValueOnce({ data: { name: "test-user", type: "user" } });

    const client = new HuggingFaceClient("hf_test_key", 60_000, "auto");
    const result = await client.checkAuth();

    expect(getMock).toHaveBeenCalledWith("/whoami-v2");
    expect(result).toEqual({ name: "test-user", type: "user" });
  });

  it("checks model availability via GET /models/{model} on the Hub API client", async () => {
    getMock.mockResolvedValueOnce({ data: {} });

    const client = new HuggingFaceClient("hf_test_key", 60_000, "auto");
    await client.checkModelAvailable("org/model");

    expect(getMock).toHaveBeenCalledWith("/models/org/model");
  });

  it("lets a generation failure propagate unwrapped", async () => {
    const apiError = new Error("provider error");
    textToImageMock.mockRejectedValueOnce(apiError);

    const client = new HuggingFaceClient("hf_test_key", 60_000, "auto");

    await expect(
      client.generateImage("org/model", { inputs: "x" })
    ).rejects.toBe(apiError);
  });
});

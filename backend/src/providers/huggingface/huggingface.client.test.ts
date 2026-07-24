import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();
const createMock = vi.fn(() => ({ get: getMock, post: postMock }));

vi.mock("axios", () => ({
  default: { create: createMock },
}));

const { HuggingFaceClient } = await import("./huggingface.client.js");

describe("HuggingFaceClient", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    createMock.mockClear();
  });

  it("configures the inference client with the given base URL, auth header, and timeout", () => {
    new HuggingFaceClient(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );

    expect(createMock).toHaveBeenCalledWith({
      baseURL: "https://router.huggingface.co/hf-inference",
      timeout: 60_000,
      headers: { Authorization: "Bearer hf_test_key" },
    });
  });

  it("configures a separate Hub API client for health checks, capped at its own timeout", () => {
    new HuggingFaceClient(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );

    expect(createMock).toHaveBeenCalledWith({
      baseURL: "https://huggingface.co/api",
      timeout: 10_000,
      headers: { Authorization: "Bearer hf_test_key" },
    });
  });

  it("generates an image via POST /models/{model} with arraybuffer response type", async () => {
    const bytes = Buffer.from("fake-png-bytes");
    postMock.mockResolvedValueOnce({
      data: bytes,
      headers: { "content-type": "image/png" },
    });

    const client = new HuggingFaceClient(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );
    const result = await client.generateImage("org/model", {
      inputs: "a cat",
    });

    expect(postMock).toHaveBeenCalledWith(
      "/models/org/model",
      { inputs: "a cat" },
      { responseType: "arraybuffer" }
    );
    expect(result).toEqual({ buffer: bytes, contentType: "image/png" });
  });

  it("defaults contentType to an empty string when the header is missing", async () => {
    postMock.mockResolvedValueOnce({ data: Buffer.from("x"), headers: {} });

    const client = new HuggingFaceClient(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );
    const result = await client.generateImage("org/model", { inputs: "x" });

    expect(result.contentType).toBe("");
  });

  it("checks auth via GET /whoami-v2 on the Hub API client", async () => {
    getMock.mockResolvedValueOnce({ data: { name: "test-user", type: "user" } });

    const client = new HuggingFaceClient(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );
    const result = await client.checkAuth();

    expect(getMock).toHaveBeenCalledWith("/whoami-v2");
    expect(result).toEqual({ name: "test-user", type: "user" });
  });

  it("checks model availability via GET /models/{model} on the Hub API client", async () => {
    getMock.mockResolvedValueOnce({ data: {} });

    const client = new HuggingFaceClient(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );
    await client.checkModelAvailable("org/model");

    expect(getMock).toHaveBeenCalledWith("/models/org/model");
  });

  it("lets a generation failure propagate unwrapped", async () => {
    const apiError = new Error("Request failed with status code 401");
    postMock.mockRejectedValueOnce(apiError);

    const client = new HuggingFaceClient(
      "https://router.huggingface.co/hf-inference",
      "hf_test_key",
      60_000
    );

    await expect(
      client.generateImage("org/model", { inputs: "x" })
    ).rejects.toBe(apiError);
  });
});

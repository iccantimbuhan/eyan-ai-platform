import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();
const createMock = vi.fn(() => ({ get: getMock, post: postMock }));

vi.mock("axios", () => ({
  default: { create: createMock },
}));

const { ComfyUIClient } = await import("./comfyui.client.js");

describe("ComfyUIClient", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    createMock.mockClear();
  });

  it("configures the underlying HTTP client with the given base URL", () => {
    new ComfyUIClient("http://127.0.0.1:8188");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "http://127.0.0.1:8188" })
    );
  });

  it("submits a workflow to POST /prompt and returns the response", async () => {
    postMock.mockResolvedValueOnce({
      data: { prompt_id: "abc-123", number: 1, node_errors: {} },
    });

    const client = new ComfyUIClient("http://127.0.0.1:8188");
    const workflow = { "1": { class_type: "KSampler", inputs: {} } };

    const result = await client.submitPrompt(workflow);

    expect(postMock).toHaveBeenCalledWith("/prompt", { prompt: workflow });
    expect(result).toEqual({ prompt_id: "abc-123", number: 1, node_errors: {} });
  });

  it("fetches history for a prompt id and returns just that entry", async () => {
    const historyEntry = {
      status: { status_str: "success", completed: true },
      outputs: { "9": { images: [{ filename: "a.png", subfolder: "", type: "output" }] } },
    };

    getMock.mockResolvedValueOnce({ data: { "abc-123": historyEntry } });

    const client = new ComfyUIClient("http://127.0.0.1:8188");
    const result = await client.getHistory("abc-123");

    expect(getMock).toHaveBeenCalledWith("/history/abc-123");
    expect(result).toEqual(historyEntry);
  });

  it("returns undefined when the prompt id has no history entry yet", async () => {
    getMock.mockResolvedValueOnce({ data: {} });

    const client = new ComfyUIClient("http://127.0.0.1:8188");
    const result = await client.getHistory("not-started-yet");

    expect(result).toBeUndefined();
  });

  it("downloads an image from GET /view with the filename/subfolder/type as query params", async () => {
    const bytes = Buffer.from("fake-png-bytes");
    getMock.mockResolvedValueOnce({ data: bytes });

    const client = new ComfyUIClient("http://127.0.0.1:8188");
    const result = await client.downloadImage({
      filename: "a.png",
      subfolder: "sub",
      type: "output",
    });

    expect(getMock).toHaveBeenCalledWith("/view", {
      params: { filename: "a.png", subfolder: "sub", type: "output" },
      responseType: "arraybuffer",
    });
    expect(result).toEqual(bytes);
  });

  it("checks reachability via GET /system_stats", async () => {
    getMock.mockResolvedValueOnce({ data: { system: {} } });

    const client = new ComfyUIClient("http://127.0.0.1:8188");
    await client.checkReachable();

    expect(getMock).toHaveBeenCalledWith("/system_stats");
  });

  it("lets a network failure propagate unwrapped", async () => {
    const networkError = new Error("connect ECONNREFUSED 127.0.0.1:8188");
    getMock.mockRejectedValueOnce(networkError);

    const client = new ComfyUIClient("http://127.0.0.1:8188");

    await expect(client.checkReachable()).rejects.toBe(networkError);
  });
});

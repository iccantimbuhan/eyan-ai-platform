import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.fn();
const isAxiosErrorMock = vi.fn().mockReturnValue(false);

vi.mock("axios", () => ({
  default: {
    post: postMock,
    isAxiosError: isAxiosErrorMock,
  },
}));

const { OllamaAiProvider } = await import("./ollama.ai-provider.js");

// A fake async-iterable byte stream, matching the shape axios gives back for
// { responseType: "stream" } (an object whose `data` is itself async-
// iterable over Buffers) — deliberately split across arbitrary byte
// boundaries, not line boundaries, since that's the real behavior TCP
// chunking produces and exactly what the line-buffering logic exists for.
function fakeByteStream(rawChunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of rawChunks) {
        yield Buffer.from(chunk, "utf8");
      }
    },
  };
}

describe("OllamaAiProvider.streamChat", () => {
  const provider = new OllamaAiProvider();

  beforeEach(() => {
    postMock.mockReset();
  });

  it("parses NDJSON lines that arrive split across multiple byte chunks", async () => {
    const line1 = `${JSON.stringify({ model: "qwen2.5-coder:7b", message: { content: "hi" }, done: false })}\n`;
    const line2 = `${JSON.stringify({ model: "qwen2.5-coder:7b", message: { content: "" }, done: true })}\n`;
    // Split arbitrarily mid-line, not on the newline.
    const splitPoint = Math.floor(line1.length / 2);

    postMock.mockResolvedValue({
      data: fakeByteStream([line1.slice(0, splitPoint), line1.slice(splitPoint) + line2.slice(0, 5), line2.slice(5)]),
    });

    const chunks = [];
    for await (const chunk of provider.streamChat([{ role: "user", content: "hi" }], { model: "qwen2.5-coder:7b" })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { delta: "hi", done: false, raw: { model: "qwen2.5-coder:7b", message: { content: "hi" }, done: false } },
      { delta: "", done: true, raw: { model: "qwen2.5-coder:7b", message: { content: "" }, done: true } },
    ]);
  });

  it("requests Ollama's own stream:true wire format", async () => {
    postMock.mockResolvedValue({ data: fakeByteStream([]) });

    const iterator = provider.streamChat([{ role: "user", content: "hi" }], { model: "qwen2.5-coder:7b", baseUrl: "http://host:11434" });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _chunk of iterator) {
      // drain
    }

    expect(postMock).toHaveBeenCalledWith(
      "http://host:11434/api/chat",
      expect.objectContaining({ model: "qwen2.5-coder:7b", stream: true }),
      expect.objectContaining({ responseType: "stream" })
    );
  });

  it("skips a malformed line defensively instead of aborting the stream", async () => {
    const goodLine = `${JSON.stringify({ message: { content: "ok" }, done: true })}\n`;
    postMock.mockResolvedValue({ data: fakeByteStream(["not json at all\n", goodLine]) });

    const chunks = [];
    for await (const chunk of provider.streamChat([{ role: "user", content: "hi" }], { model: "qwen2.5-coder:7b" })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ delta: "ok", done: true, raw: { message: { content: "ok" }, done: true } }]);
  });
});

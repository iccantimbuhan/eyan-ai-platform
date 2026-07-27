import { describe, expect, it } from "vitest";

import { FakeImageProvider } from "./fake-image.provider.js";

describe("FakeImageProvider", () => {
  const provider = new FakeImageProvider();

  it("is registered under the name 'fake'", () => {
    expect(provider.name).toBe("fake");
  });

  it("returns a deterministic buffer for the same request", async () => {
    const request = {
      prompt: "A cat in a hat",
      width: 512,
      height: 512,
      format: "png" as const,
    };

    const first = await provider.generate(request);
    const second = await provider.generate(request);

    expect(first.buffer).toEqual(second.buffer);
  });

  it("echoes back the requested dimensions and format", async () => {
    const result = await provider.generate({
      prompt: "A dog",
      width: 256,
      height: 128,
      format: "webp",
    });

    expect(result.width).toBe(256);
    expect(result.height).toBe(128);
    expect(result.format).toBe("webp");
    expect(result.model).toBe("fake-image-v1");
  });

  it("makes no network calls — resolves synchronously fast for a large batch", async () => {
    const start = Date.now();

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        provider.generate({
          prompt: `prompt-${i}`,
          width: 512,
          height: 512,
          format: "png",
        })
      )
    );

    expect(Date.now() - start).toBeLessThan(100);
  });
});

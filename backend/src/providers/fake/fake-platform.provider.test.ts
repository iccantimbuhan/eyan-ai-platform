import { describe, expect, it } from "vitest";

import { FakePlatformProvider } from "./fake-platform.provider.js";

describe("FakePlatformProvider", () => {
  const provider = new FakePlatformProvider();

  it("is registered under the name 'fake'", () => {
    expect(provider.name).toBe("fake");
  });

  it("returns a deterministic result for the same request", async () => {
    const request = {
      projectId: "project-1",
      assetType: "IMAGE",
      sourceId: "image-1",
      title: "A cat in a hat",
      body: "Look at this cat.",
    };

    const first = await provider.publish(request);
    const second = await provider.publish(request);

    expect(first).toEqual(second);
    expect(first.externalId).toBe("fake-image-image-1");
    expect(first.externalUrl).toBe(
      "https://fake-platform.example.com/posts/image-image-1"
    );
  });

  it("makes no network calls — resolves synchronously fast for a large batch", async () => {
    const start = Date.now();

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        provider.publish({
          projectId: "project-1",
          assetType: "IMAGE",
          sourceId: `image-${i}`,
          title: `title-${i}`,
          body: `body-${i}`,
        })
      )
    );

    expect(Date.now() - start).toBeLessThan(100);
  });
});

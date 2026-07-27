import { beforeEach, describe, expect, it } from "vitest";

import { ImageProviderFactory } from "./image-provider.factory.js";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageProvider,
} from "./interfaces/image-provider.js";
import { UnsupportedImageProviderError } from "../errors/image-provider.error.js";

class FakeImageProvider implements ImageProvider {
  readonly name = "fake";

  async generate(
    _request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    return {
      buffer: Buffer.from("fake-bytes"),
      model: "fake-model",
      width: 512,
      height: 512,
      format: "png",
    };
  }
}

describe("ImageProviderFactory", () => {
  beforeEach(() => {
    ImageProviderFactory.reset();
  });

  it("has no providers registered by default", () => {
    expect(ImageProviderFactory.listRegistered()).toEqual([]);
  });

  it("registers a provider and creates it by name", () => {
    ImageProviderFactory.register("fake", FakeImageProvider);

    const provider = ImageProviderFactory.create("fake");

    expect(provider).toBeInstanceOf(FakeImageProvider);
    expect(provider.name).toBe("fake");
  });

  it("resolves provider names case-insensitively and trims whitespace", () => {
    ImageProviderFactory.register("Fake", FakeImageProvider);

    expect(ImageProviderFactory.create(" FAKE ")).toBeInstanceOf(
      FakeImageProvider
    );
    expect(ImageProviderFactory.listRegistered()).toEqual(["fake"]);
  });

  it("throws UnsupportedImageProviderError for an unregistered provider", () => {
    expect(() => ImageProviderFactory.create("stability-ai")).toThrow(
      UnsupportedImageProviderError
    );
  });

  it("throws UnsupportedImageProviderError when no provider name is configured", () => {
    expect(() => ImageProviderFactory.create("")).toThrow(
      UnsupportedImageProviderError
    );
  });

  it("lists every registered provider name", () => {
    ImageProviderFactory.register("fake-a", FakeImageProvider);
    ImageProviderFactory.register("fake-b", FakeImageProvider);

    expect(ImageProviderFactory.listRegistered().sort()).toEqual([
      "fake-a",
      "fake-b",
    ]);
  });
});

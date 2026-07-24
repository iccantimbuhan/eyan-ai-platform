import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { imageProvider: "", geminiApiKey: "", geminiModel: "gemini-2.5-flash-image" },
}));

import { env } from "../config/env.js";
import {
  registerImageProviders,
  validateImageProviderConfig,
} from "./register-image-providers.js";
import { ImageProviderFactory } from "./image-provider.factory.js";
import { FakeImageProvider } from "./fake/fake-image.provider.js";
import { GeminiImageProvider } from "./gemini/gemini-image.provider.js";

describe("registerImageProviders", () => {
  beforeEach(() => {
    ImageProviderFactory.reset();
    (env as { imageProvider: string }).imageProvider = "";
  });

  it("registers the fake and gemini providers", () => {
    registerImageProviders();

    expect(ImageProviderFactory.listRegistered().sort()).toEqual([
      "fake",
      "gemini",
    ]);
    expect(ImageProviderFactory.create("fake")).toBeInstanceOf(
      FakeImageProvider
    );
    expect(ImageProviderFactory.create("gemini")).toBeInstanceOf(
      GeminiImageProvider
    );
  });
});

describe("validateImageProviderConfig", () => {
  beforeEach(() => {
    ImageProviderFactory.reset();
    (env as { imageProvider: string }).imageProvider = "";
  });

  it("does not throw when IMAGE_PROVIDER is unset", () => {
    expect(() => validateImageProviderConfig()).not.toThrow();
  });

  it("does not throw when IMAGE_PROVIDER matches a registered provider", () => {
    ImageProviderFactory.register("fake", FakeImageProvider);
    (env as { imageProvider: string }).imageProvider = "fake";

    expect(() => validateImageProviderConfig()).not.toThrow();
  });

  it("is case-insensitive when matching against the registry", () => {
    ImageProviderFactory.register("fake", FakeImageProvider);
    (env as { imageProvider: string }).imageProvider = "FAKE";

    expect(() => validateImageProviderConfig()).not.toThrow();
  });

  it("throws when IMAGE_PROVIDER is set to a name nothing has registered", () => {
    ImageProviderFactory.register("fake", FakeImageProvider);
    (env as { imageProvider: string }).imageProvider = "openai";

    expect(() => validateImageProviderConfig()).toThrow(
      /IMAGE_PROVIDER is set to "openai"/
    );
  });
});

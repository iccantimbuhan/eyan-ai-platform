import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    imageProvider: "",
    geminiApiKey: "",
    geminiModel: "gemini-2.5-flash-image",
    comfyuiUrl: "http://127.0.0.1:8188",
    comfyuiWorkflow: "sdxl",
    comfyuiTimeout: 120_000,
    comfyuiPollInterval: 2_000,
    huggingfaceApiKey: "hf_test_key",
    huggingfaceModel: "black-forest-labs/FLUX.1-schnell",
    huggingfaceProvider: "auto",
    huggingfaceTimeout: 60_000,
  },
}));

import { env } from "../config/env.js";
import {
  registerImageProviders,
  validateImageProviderConfig,
} from "./register-image-providers.js";
import { ImageProviderFactory } from "./image-provider.factory.js";
import { FakeImageProvider } from "./fake/fake-image.provider.js";
import { GeminiImageProvider } from "./gemini/gemini-image.provider.js";
import { ComfyUIProvider } from "./comfyui/comfyui.provider.js";
import { HuggingFaceProvider } from "./huggingface/huggingface.provider.js";

describe("registerImageProviders", () => {
  beforeEach(() => {
    ImageProviderFactory.reset();
    (env as { imageProvider: string }).imageProvider = "";
  });

  it("registers the fake, gemini, comfyui, and huggingface providers", () => {
    registerImageProviders();

    expect(ImageProviderFactory.listRegistered().sort()).toEqual([
      "comfyui",
      "fake",
      "gemini",
      "huggingface",
    ]);
    expect(ImageProviderFactory.create("fake")).toBeInstanceOf(
      FakeImageProvider
    );
    expect(ImageProviderFactory.create("gemini")).toBeInstanceOf(
      GeminiImageProvider
    );
    expect(ImageProviderFactory.create("comfyui")).toBeInstanceOf(
      ComfyUIProvider
    );
    expect(ImageProviderFactory.create("huggingface")).toBeInstanceOf(
      HuggingFaceProvider
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

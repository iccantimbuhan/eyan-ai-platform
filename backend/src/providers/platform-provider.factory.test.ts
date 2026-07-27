import { beforeEach, describe, expect, it } from "vitest";

import { PlatformProviderFactory } from "./platform-provider.factory.js";
import type {
  PlatformProvider,
  PublishRequest,
  PublishResult,
} from "./interfaces/platform-provider.js";
import { UnsupportedPlatformProviderError } from "../errors/publishing.error.js";

class FakePlatformProvider implements PlatformProvider {
  readonly name = "fake";

  async publish(_request: PublishRequest): Promise<PublishResult> {
    return {
      externalId: "fake-id",
      externalUrl: "https://fake-platform.example.com/posts/fake-id",
    };
  }
}

describe("PlatformProviderFactory", () => {
  beforeEach(() => {
    PlatformProviderFactory.reset();
  });

  it("has no providers registered by default", () => {
    expect(PlatformProviderFactory.listRegistered()).toEqual([]);
  });

  it("registers a provider and creates it by name", () => {
    PlatformProviderFactory.register("fake", FakePlatformProvider);

    const provider = PlatformProviderFactory.create("fake");

    expect(provider).toBeInstanceOf(FakePlatformProvider);
    expect(provider.name).toBe("fake");
  });

  it("resolves provider names case-insensitively and trims whitespace", () => {
    PlatformProviderFactory.register("Fake", FakePlatformProvider);

    expect(PlatformProviderFactory.create(" FAKE ")).toBeInstanceOf(
      FakePlatformProvider
    );
    expect(PlatformProviderFactory.listRegistered()).toEqual(["fake"]);
  });

  it("throws UnsupportedPlatformProviderError for an unregistered provider", () => {
    expect(() => PlatformProviderFactory.create("facebook")).toThrow(
      UnsupportedPlatformProviderError
    );
  });

  it("throws UnsupportedPlatformProviderError when an empty platform name is given", () => {
    expect(() => PlatformProviderFactory.create("")).toThrow(
      UnsupportedPlatformProviderError
    );
  });

  it("lists every registered provider name", () => {
    PlatformProviderFactory.register("fake-a", FakePlatformProvider);
    PlatformProviderFactory.register("fake-b", FakePlatformProvider);

    expect(PlatformProviderFactory.listRegistered().sort()).toEqual([
      "fake-a",
      "fake-b",
    ]);
  });
});

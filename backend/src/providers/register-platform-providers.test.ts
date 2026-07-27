import { beforeEach, describe, expect, it } from "vitest";

import { registerPlatformProviders } from "./register-platform-providers.js";
import { PlatformProviderFactory } from "./platform-provider.factory.js";
import { FakePlatformProvider } from "./fake/fake-platform.provider.js";

describe("registerPlatformProviders", () => {
  beforeEach(() => {
    PlatformProviderFactory.reset();
  });

  it("registers the fake provider", () => {
    registerPlatformProviders();

    expect(PlatformProviderFactory.listRegistered()).toEqual(["fake"]);
    expect(PlatformProviderFactory.create("fake")).toBeInstanceOf(
      FakePlatformProvider
    );
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import { registerImageProviders } from "./register-image-providers.js";
import { ImageProviderFactory } from "./image-provider.factory.js";
import { FakeImageProvider } from "./fake/fake-image.provider.js";

describe("registerImageProviders", () => {
  beforeEach(() => {
    ImageProviderFactory.reset();
  });

  it("registers the fake provider", () => {
    registerImageProviders();

    expect(ImageProviderFactory.listRegistered()).toEqual(["fake"]);
    expect(ImageProviderFactory.create("fake")).toBeInstanceOf(
      FakeImageProvider
    );
  });
});

import { describe, expect, it } from "vitest";

import { StorageProviderFactory } from "./storage-provider.factory.js";
import { LocalDiskStorageProvider } from "./local-disk/local-disk-storage.provider.js";

describe("StorageProviderFactory", () => {
  it("creates a LocalDiskStorageProvider", () => {
    const provider = StorageProviderFactory.create();

    expect(provider).toBeInstanceOf(LocalDiskStorageProvider);
  });
});

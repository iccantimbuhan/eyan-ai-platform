import { LocalDiskStorageProvider } from "./local-disk/local-disk-storage.provider.js";
import type { StorageProvider } from "./interfaces/storage-provider.js";

export class StorageProviderFactory {
  static create(): StorageProvider {
    return new LocalDiskStorageProvider();
  }
}

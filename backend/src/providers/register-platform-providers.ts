import { PlatformProviderFactory } from "./platform-provider.factory.js";
import { FakePlatformProvider } from "./fake/fake-platform.provider.js";

// Called once at application startup (see app.ts). Real providers
// (Facebook, Instagram, LinkedIn, TikTok, YouTube, WordPress, ...)
// register themselves here in a later sprint — no other file
// (AssetService, routes, PlatformProviderFactory itself) needs to change
// when one is added.
export function registerPlatformProviders(): void {
  PlatformProviderFactory.register("fake", FakePlatformProvider);
}

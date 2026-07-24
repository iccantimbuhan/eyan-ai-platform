import { ImageProviderFactory } from "./image-provider.factory.js";
import { FakeImageProvider } from "./fake/fake-image.provider.js";
import { GeminiImageProvider } from "./gemini/gemini-image.provider.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

// Called once at application startup (see app.ts). Real providers (OpenAI
// Images, Stability AI, FLUX, ...) register themselves here in later
// phases — no other file (ImageService, routes, ImageProviderFactory
// itself) needs to change when one is added.
export function registerImageProviders(): void {
  ImageProviderFactory.register("fake", FakeImageProvider);
  ImageProviderFactory.register("gemini", GeminiImageProvider);
}

// Must run after registerImageProviders(), since it checks the registry
// registerImageProviders() just populated. Fails fast at boot (mirroring
// env.ts's requireEnv() philosophy) if IMAGE_PROVIDER is set to a name
// nothing registered — catching a typo'd or stale config value immediately
// instead of surfacing it as a confusing 400 on the first real request.
// An unset IMAGE_PROVIDER is valid (per-request "provider" overrides still
// work), so it only warns, it doesn't throw.
export function validateImageProviderConfig(): void {
  if (!env.imageProvider) {
    logger.warn(
      "[ImageProviderFactory] IMAGE_PROVIDER is not set. Image generation will require an explicit \"provider\" on every request until a default is configured."
    );
    return;
  }

  const registered = ImageProviderFactory.listRegistered();
  const configured = env.imageProvider.trim().toLowerCase();

  if (!registered.includes(configured)) {
    throw new Error(
      `IMAGE_PROVIDER is set to "${env.imageProvider}", but no provider is registered under that name. Registered providers: ${
        registered.length > 0 ? registered.join(", ") : "(none)"
      }.`
    );
  }
}

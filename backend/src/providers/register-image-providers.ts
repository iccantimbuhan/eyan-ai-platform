import { ImageProviderFactory } from "./image-provider.factory.js";
import { FakeImageProvider } from "./fake/fake-image.provider.js";

// Called once at application startup (see app.ts). Real providers (OpenAI
// Images, Gemini, Stability AI, FLUX, ...) register themselves here in
// later phases — no other file (ImageService, routes, ImageProviderFactory
// itself) needs to change when one is added.
export function registerImageProviders(): void {
  ImageProviderFactory.register("fake", FakeImageProvider);
}

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { UnsupportedImageProviderError } from "../errors/image-provider.error.js";
import type { ImageProvider } from "./interfaces/image-provider.js";

type ImageProviderConstructor = new () => ImageProvider;

// Unlike ProviderFactory (text generation, deliberately single-provider —
// see ADR-0001), image generation has no local/GPU option on this hardware,
// so multiple hosted providers (OpenAI Images, Gemini, Stability AI, FLUX,
// ...) are all real, expected candidates. A registry lets each one be added
// later as its own class with zero changes to callers of create().
export class ImageProviderFactory {
  private static readonly registry = new Map<string, ImageProviderConstructor>();

  static register(name: string, provider: ImageProviderConstructor): void {
    const key = normalizeName(name);

    if (this.registry.has(key)) {
      logger.warn(
        `[ImageProviderFactory] Overwriting already-registered provider "${key}".`
      );
    }

    this.registry.set(key, provider);
  }

  static create(providerName: string = env.imageProvider): ImageProvider {
    const key = normalizeName(providerName);
    const Provider = this.registry.get(key);

    if (!Provider) {
      throw new UnsupportedImageProviderError(providerName);
    }

    return new Provider();
  }

  static listRegistered(): string[] {
    return Array.from(this.registry.keys());
  }

  static reset(): void {
    this.registry.clear();
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

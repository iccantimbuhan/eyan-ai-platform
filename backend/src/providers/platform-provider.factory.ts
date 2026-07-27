import { logger } from "../lib/logger.js";
import { UnsupportedPlatformProviderError } from "../errors/publishing.error.js";
import type { PlatformProvider } from "./interfaces/platform-provider.js";

type PlatformProviderConstructor = new () => PlatformProvider;

// Mirrors ImageProviderFactory's registry shape, not ProviderFactory's
// single-hardcoded-provider shape (ADR-0001): unlike text generation, real
// publishing targets (Facebook, Instagram, LinkedIn, TikTok, YouTube,
// WordPress, ...) are known, expected candidates, so a registry lets each
// one be added later as its own class with zero changes to callers of
// create(). Unlike ImageProviderFactory, there is no env-var default —
// platform is always explicit per PublishingRecord, since no single global
// default makes sense across multiple publishing targets. See ADR-0010.
export class PlatformProviderFactory {
  private static readonly registry = new Map<string, PlatformProviderConstructor>();

  static register(name: string, provider: PlatformProviderConstructor): void {
    const key = normalizeName(name);

    if (this.registry.has(key)) {
      logger.warn(
        `[PlatformProviderFactory] Overwriting already-registered provider "${key}".`
      );
    }

    this.registry.set(key, provider);
  }

  static create(providerName: string): PlatformProvider {
    const key = normalizeName(providerName);
    const Provider = this.registry.get(key);

    if (!Provider) {
      throw new UnsupportedPlatformProviderError(providerName);
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

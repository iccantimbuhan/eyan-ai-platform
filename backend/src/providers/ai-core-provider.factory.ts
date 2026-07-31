import { logger } from "../lib/logger.js";
import { UnsupportedAiProviderError } from "../errors/ai-core-provider.error.js";
import type { AiCoreProvider } from "./interfaces/ai-core-provider.js";

type AiCoreProviderConstructor = new () => AiCoreProvider;

// Mirrors McpConnectorFactory's registry shape exactly (register/create/
// listRegistered/reset) — deliberately with no env-var default, unlike
// ImageProviderFactory. Every real caller (AiRoutingService) always resolves
// an explicit AiProvider.key from a Brain's active AiRoutingPolicy before
// calling create(); there is no scenario where AI Core needs a global
// "current default provider" the way IMAGE_PROVIDER exists for image
// generation. See TDD §9.
export class AiCoreProviderFactory {
  private static readonly registry = new Map<string, AiCoreProviderConstructor>();

  static register(key: string, provider: AiCoreProviderConstructor): void {
    const normalized = normalizeKey(key);

    if (this.registry.has(normalized)) {
      logger.warn(`[AiCoreProviderFactory] Overwriting already-registered provider "${normalized}".`);
    }

    this.registry.set(normalized, provider);
  }

  static create(providerKey: string): AiCoreProvider {
    const normalized = normalizeKey(providerKey);
    const Provider = this.registry.get(normalized);

    if (!Provider) {
      throw new UnsupportedAiProviderError(providerKey);
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

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

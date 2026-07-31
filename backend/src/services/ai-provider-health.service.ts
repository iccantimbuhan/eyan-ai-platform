import { aiProviderRepository, AiProviderRepository } from "../repositories/ai-provider.repository.js";
import { aiProviderService, AiProviderService } from "./ai-provider.service.js";
import { AiCoreProviderFactory } from "../providers/ai-core-provider.factory.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AiProvider } from "../generated/prisma/client.js";
import type { McpHealthStatus } from "../generated/prisma/enums.js";

export interface HealthCheckResult {
  status: McpHealthStatus;
  message?: string;
}

// Mirrors McpHealthService's actual behavior (Phase 0.5 Finding 6) — the
// original Phase 0 draft cited McpHealthService as precedent for
// AiProvider.healthStatus without a service that ever populated it. This is
// that service: resolves the provider plugin from AiCoreProviderFactory,
// resolves credentials for HOSTED providers the same way AiRoutingService
// does, calls the plugin's healthCheck(), and persists the result. Every
// failure path (unregistered provider, credential resolution failure,
// network failure) is caught and turned into a persisted ERROR/UNREACHABLE
// result rather than thrown — same posture as McpHealthService.
export class AiProviderHealthService {
  constructor(
    private readonly repository: AiProviderRepository = aiProviderRepository,
    private readonly providerService: AiProviderService = aiProviderService
  ) {}

  async checkHealth(providerId: string, actorId: string | null): Promise<HealthCheckResult> {
    const provider = await this.repository.findById(providerId);
    if (!provider) {
      throw new NotFoundError("AI Core provider not found.");
    }

    const result = await this.evaluate(provider, actorId);
    await this.repository.updateHealthStatus(providerId, result.status, result.message ?? null);
    return result;
  }

  private async evaluate(provider: AiProvider, actorId: string | null): Promise<HealthCheckResult> {
    try {
      const plugin = AiCoreProviderFactory.create(provider.key);
      const credentials =
        provider.kind === "HOSTED"
          ? ((await this.providerService.resolveCredentials(provider.id, actorId)) ?? undefined)
          : undefined;

      const result = await plugin.healthCheck(provider.baseUrl, credentials);

      return result.healthy
        ? { status: "HEALTHY", message: result.message }
        : { status: "UNREACHABLE", message: result.message };
    } catch (error) {
      return { status: "ERROR", message: error instanceof Error ? error.message : "Health check failed." };
    }
  }
}

export const aiProviderHealthService = new AiProviderHealthService();

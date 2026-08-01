import type { Response } from "express";
import { AxiosError } from "axios";
import { aiCapabilityService, AiCapabilityService } from "./ai-capability.service.js";
import { aiRoutingPolicyService, AiRoutingPolicyService } from "./ai-routing-policy.service.js";
import { OllamaProvider } from "../providers/ollama/ollama.provider.js";
import { ApiError } from "../errors/api-error.js";
import type {
  AIProvider,
  ChatOptions,
  OllamaMessage,
} from "../providers/interfaces/ai-provider.js";

// The Capability this service resolves its provider/model from — see
// prisma/seed-ai-core.ts's seedGeneralChatBrain() for why this only
// resolves configuration (not execution) through AI Core.
const GENERAL_CHAT_CAPABILITY_KEY = "general-chat";

export class ChatService {
  private providerPromise: Promise<AIProvider> | null = null;

  constructor(
    private readonly capabilityService: AiCapabilityService = aiCapabilityService,
    private readonly routingPolicyService: AiRoutingPolicyService = aiRoutingPolicyService
  ) {}

  // Resolves which provider/model to call via AI Core's Capability -> Brain
  // -> RoutingPolicy chain (Sprint 3 Phase 1) instead of the retired
  // hardcoded ProviderFactory. Cached per ChatService instance (one per
  // request) so a single chat/stream call only resolves once.
  private resolveProvider(): Promise<AIProvider> {
    if (!this.providerPromise) {
      this.providerPromise = this.buildProvider();
    }
    return this.providerPromise;
  }

  private async buildProvider(): Promise<AIProvider> {
    const capability = await this.capabilityService.getByKeyWithBrain(GENERAL_CHAT_CAPABILITY_KEY);
    if (!capability || !capability.isEnabled || !capability.brain.isEnabled) {
      throw new ApiError(503, "Unable to connect to AI provider.");
    }

    const policy = await this.routingPolicyService.getActiveByBrain(capability.brain.id);
    if (!policy || policy.preferredProvider.key !== "ollama") {
      // Chat's execution path only understands the legacy Ollama-compatible
      // AIProvider interface today — see seedGeneralChatBrain()'s doc
      // comment. Re-pointing this Brain at a different provider in the UI
      // is a Phase 4 prerequisite (a generic multi-provider adapter), not a
      // silently-ignored config change.
      throw new ApiError(503, "Unable to connect to AI provider.");
    }

    return new OllamaProvider({
      baseUrl: policy.preferredProvider.baseUrl ?? undefined,
      model: policy.preferredModel.modelKey,
    });
  }

  async chat(messages: OllamaMessage[], options?: ChatOptions) {
    try {
      const provider = await this.resolveProvider();
      return await provider.chat(messages, options);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // The client only ever sees the generic message below — this is
      // purely for server-side diagnosis, since without it a real cause
      // (e.g. a cold-start timeout) is indistinguishable from Ollama being
      // genuinely unreachable.
      console.error("[chat] AI provider request failed", {
        type: error instanceof AxiosError ? "AxiosError" : error?.constructor?.name,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof AxiosError ? error.code : undefined,
        timeoutMs: error instanceof AxiosError ? error.config?.timeout : undefined,
      });

      throw new ApiError(503, "Unable to connect to AI provider.");
    }
  }

  async stream(messages: OllamaMessage[], res: Response, options?: ChatOptions) {
    try {
      const provider = await this.resolveProvider();
      const response = await provider.streamChat?.(messages, options);

      if (!response) {
        throw new ApiError(501, "Streaming not supported.");
      }

      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Transfer-Encoding", "chunked");
      res.flushHeaders();

      response.data.on("error", (error: Error) => {
        console.error("[stream] Upstream stream error", error);
        if (!res.destroyed) {
          res.destroy(error);
        }
      });

      response.data.pipe(res);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(503, "Unable to connect to AI provider.");
    }
  }
}

import { aiBrainService, AiBrainService } from "./ai-brain.service.js";
import { aiRoutingPolicyService, AiRoutingPolicyService } from "./ai-routing-policy.service.js";
import { aiProviderService, AiProviderService } from "./ai-provider.service.js";
import { aiUsageService, AiUsageService } from "./ai-usage.service.js";
import {
  aiConversationRepository,
  AiConversationRepository,
} from "../repositories/ai-conversation.repository.js";
import { AiCoreProviderFactory } from "../providers/ai-core-provider.factory.js";
import { NotFoundError } from "../errors/auth.error.js";
import { AiConversationError } from "../errors/ai-core-provider.error.js";
import { classifyChatError, probeOllamaModelLoaded } from "../lib/ai-chat-error-classifier.js";
import { logger } from "../lib/logger.js";
import type { AiConversationRole } from "../generated/prisma/enums.js";
import type { AiCoreMessage, AiCoreStreamChunk } from "../providers/interfaces/ai-core-provider.js";

const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434";

export interface AiConversationTurnMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiConverseOptions {
  brainKey: string;
  // Omitted -> a brand-new conversation is created and its id returned;
  // `messages` is then the conversation's entire starting exchange.
  // Supplied -> must reference an existing conversation for this Brain;
  // `messages` is only the NEW turn(s) to append (typically one user
  // message) — stored history is loaded and prepended automatically. This
  // is the one place the "messages means the full exchange" contract
  // conditionally changes, and it's deliberate: it's what makes conversation
  // history a real, load-bearing feature rather than a parallel audit log
  // the model never actually sees.
  conversationId?: string;
  messages: AiConversationTurnMessage[];
  actorId: string | null;
  maxTokens?: number;
}

export interface AiConverseResult {
  conversationId: string;
  content: string;
  model: string;
  provider: string;
  brain: string;
  latencyMs: number;
}

export interface AiStreamConverseChunk extends AiCoreStreamChunk {
  conversationId: string;
}

const ROLE_TO_DB: Record<AiConversationTurnMessage["role"], AiConversationRole> = {
  system: "SYSTEM",
  user: "USER",
  assistant: "ASSISTANT",
};

const DB_ROLE_TO_MESSAGE: Record<AiConversationRole, AiConversationTurnMessage["role"]> = {
  SYSTEM: "system",
  USER: "user",
  ASSISTANT: "assistant",
};

// Sprint 4 — the Conversation Engine. The one execution surface a business
// module uses for multi-turn, streaming-capable AI interaction — resolving
// directly Brain -> RoutingPolicy -> Provider -> Model, deliberately with
// no Capability step (the brief's own "Conversation -> Brain" chain; see
// prisma schema AiConversation's doc comment for why this is a sanctioned
// exception to the Capability-only rule invoke() enforces for one-shot task
// execution). Never called by a business module directly against a
// provider — ChatService is the one caller today, and is now a thin
// HTTP-shaping wrapper around this service, not an AI orchestrator itself.
export class AiConversationService {
  constructor(
    private readonly brainService: AiBrainService = aiBrainService,
    private readonly routingPolicyService: AiRoutingPolicyService = aiRoutingPolicyService,
    private readonly providerService: AiProviderService = aiProviderService,
    private readonly repository: AiConversationRepository = aiConversationRepository,
    private readonly usageService: AiUsageService = aiUsageService
  ) {}

  async converse(options: AiConverseOptions): Promise<AiConverseResult> {
    const { brain, policy } = await this.resolveChain(options.brainKey);
    const conversationId = await this.ensureConversation(brain.id, options.conversationId);
    const messages = await this.buildMessages(options.conversationId, options.messages);

    const provider = AiCoreProviderFactory.create(policy.preferredProvider.key);
    const credentials = await this.resolveCredentialsIfHosted(policy.preferredProvider, options.actorId);

    const startedAt = Date.now();

    try {
      const result = await provider.chat(
        messages,
        {
          model: policy.preferredModel.modelKey,
          baseUrl: policy.preferredProvider.baseUrl,
          maxTokens: options.maxTokens,
        },
        credentials
      );

      const latencyMs = Date.now() - startedAt;

      await this.persistTurn(conversationId, options.messages, result.content);
      void this.usageService.record({
        brainId: brain.id,
        providerId: policy.preferredProvider.id,
        modelId: policy.preferredModel.id,
        outcome: "VALID",
        latencyMs,
      });

      return {
        conversationId,
        content: result.content,
        model: result.model || policy.preferredModel.modelKey,
        provider: policy.preferredProvider.key,
        brain: brain.key,
        latencyMs,
      };
    } catch (error) {
      const classified = await this.classifyAndLog(error, policy, { streaming: false });
      void this.usageService.record({
        brainId: brain.id,
        providerId: policy.preferredProvider.id,
        modelId: policy.preferredModel.id,
        outcome: outcomeForCategory(classified.category),
        latencyMs: Date.now() - startedAt,
        needsManualReview: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw classified;
    }
  }

  // No corrective retry loop here (unlike invoke()'s JSON-validation
  // retries) — a conversational reply has no schema to validate against,
  // and for streaming specifically, retrying after tokens have already
  // reached the client isn't meaningful. Exactly one provider call, same
  // posture as the legacy ChatService this replaces.
  async *streamConverse(options: AiConverseOptions): AsyncGenerator<AiStreamConverseChunk> {
    const { brain, policy } = await this.resolveChain(options.brainKey);
    const conversationId = await this.ensureConversation(brain.id, options.conversationId);
    const messages = await this.buildMessages(options.conversationId, options.messages);

    const provider = AiCoreProviderFactory.create(policy.preferredProvider.key);
    if (!provider.streamChat) {
      throw new AiConversationError(
        501,
        "This Brain's configured provider does not support streaming.",
        "CONFIGURATION_ERROR"
      );
    }
    const credentials = await this.resolveCredentialsIfHosted(policy.preferredProvider, options.actorId);

    await this.repository.appendMessages(
      options.messages.map((message) => ({
        conversationId,
        role: ROLE_TO_DB[message.role],
        content: message.content,
      }))
    );

    const startedAt = Date.now();
    let accumulated = "";

    try {
      for await (const chunk of provider.streamChat(
        messages,
        { model: policy.preferredModel.modelKey, baseUrl: policy.preferredProvider.baseUrl, maxTokens: options.maxTokens },
        credentials
      )) {
        accumulated += chunk.delta;
        yield { ...chunk, conversationId };
      }

      if (accumulated) {
        await this.repository.appendMessage({ conversationId, role: "ASSISTANT", content: accumulated });
        await this.repository.touch(conversationId);
      }

      void this.usageService.record({
        brainId: brain.id,
        providerId: policy.preferredProvider.id,
        modelId: policy.preferredModel.id,
        outcome: "VALID",
        latencyMs: Date.now() - startedAt,
      });
    } catch (error) {
      const classified = await this.classifyAndLog(error, policy, { streaming: true });
      void this.usageService.record({
        brainId: brain.id,
        providerId: policy.preferredProvider.id,
        modelId: policy.preferredModel.id,
        outcome: outcomeForCategory(classified.category),
        latencyMs: Date.now() - startedAt,
        needsManualReview: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw classified;
    }
  }

  async getHistory(conversationId: string) {
    const conversation = await this.repository.findByIdWithMessages(conversationId);
    if (!conversation) {
      throw new NotFoundError(`Conversation "${conversationId}" not found.`);
    }
    return conversation;
  }

  private async resolveChain(brainKey: string) {
    const brain = await this.brainService.getByKey(brainKey);
    if (!brain || !brain.isEnabled) {
      throw new NotFoundError(`AI Brain "${brainKey}" not found or disabled.`);
    }

    const policy = await this.routingPolicyService.getActiveByBrain(brain.id);
    if (!policy) {
      throw new NotFoundError(`AI Brain "${brainKey}" has no active Routing Policy.`);
    }

    return { brain, policy };
  }

  private async ensureConversation(brainId: string, conversationId?: string): Promise<string> {
    if (!conversationId) {
      const created = await this.repository.create({ brainId });
      return created.id;
    }

    const existing = await this.repository.findByIdWithMessages(conversationId);
    if (!existing || existing.brainId !== brainId) {
      throw new NotFoundError(`Conversation "${conversationId}" not found for this Brain.`);
    }

    return existing.id;
  }

  private async buildMessages(
    conversationId: string | undefined,
    turnMessages: AiConversationTurnMessage[]
  ): Promise<AiCoreMessage[]> {
    const history = conversationId ? await this.repository.findByIdWithMessages(conversationId) : null;

    const historyMessages: AiCoreMessage[] = (history?.messages ?? []).map((message) => ({
      role: DB_ROLE_TO_MESSAGE[message.role],
      content: message.content,
    }));

    return [...historyMessages, ...turnMessages.map((message) => ({ role: message.role, content: message.content }))];
  }

  private async persistTurn(
    conversationId: string,
    turnMessages: AiConversationTurnMessage[],
    assistantContent: string
  ): Promise<void> {
    await this.repository.appendMessages(
      turnMessages.map((message) => ({
        conversationId,
        role: ROLE_TO_DB[message.role],
        content: message.content,
      }))
    );
    await this.repository.appendMessage({ conversationId, role: "ASSISTANT", content: assistantContent });
    await this.repository.touch(conversationId);
  }

  private async resolveCredentialsIfHosted(
    provider: { id: string; kind: string },
    actorId: string | null
  ): Promise<Record<string, unknown> | undefined> {
    if (provider.kind !== "HOSTED") return undefined;
    const credentials = await this.providerService.resolveCredentials(provider.id, actorId);
    return credentials ?? undefined;
  }

  // Sprint 4 (AI Chat Stabilization) — turns a raw provider-call failure
  // into an already-classified AiConversationError, logging full backend
  // diagnostics (provider/model/category/streaming/raw message) here, once,
  // regardless of caller (ChatService today; any future conversational
  // caller later) — the caller only ever sees the friendly, pre-built
  // ApiError.
  private async classifyAndLog(
    error: unknown,
    policy: {
      preferredProvider: { key: string; baseUrl: string | null };
      preferredModel: { modelKey: string };
    },
    context: { streaming: boolean }
  ): Promise<AiConversationError> {
    let modelLoaded: boolean | null = null;

    if (policy.preferredProvider.key === "ollama") {
      const baseUrl = policy.preferredProvider.baseUrl || OLLAMA_DEFAULT_BASE_URL;
      modelLoaded = await probeOllamaModelLoaded(baseUrl, policy.preferredModel.modelKey);
    }

    const classification = classifyChatError(error, { ...context, modelLoaded });

    logger.error("[AiConversationService] AI provider call failed", {
      category: classification.category,
      provider: policy.preferredProvider.key,
      model: policy.preferredModel.modelKey,
      streaming: context.streaming,
      modelLoaded,
      message: error instanceof Error ? error.message : String(error),
    });

    return new AiConversationError(classification.httpStatus, classification.userMessage, classification.category);
  }
}

function outcomeForCategory(category: string): "TRANSIENT_FAILURE" | "DEFINITIVE_FAILURE" {
  return category === "MODEL_UNAVAILABLE" || category === "CONFIGURATION_ERROR"
    ? "DEFINITIVE_FAILURE"
    : "TRANSIENT_FAILURE";
}

export const aiConversationService = new AiConversationService();

import {
  aiCapabilityRepository,
  AiCapabilityRepository,
} from "../repositories/ai-capability.repository.js";
import { aiBrainRepository, AiBrainRepository } from "../repositories/ai-brain.repository.js";
import {
  aiRoutingPolicyRepository,
  AiRoutingPolicyRepository,
} from "../repositories/ai-routing-policy.repository.js";
import { aiPromptRepository, AiPromptRepository } from "../repositories/ai-prompt.repository.js";
import { aiProviderRepository, AiProviderRepository } from "../repositories/ai-provider.repository.js";
import { aiModelRepository, AiModelRepository } from "../repositories/ai-model.repository.js";
import { aiProviderService, AiProviderService } from "./ai-provider.service.js";
import { aiUsageService, AiUsageService } from "./ai-usage.service.js";
import { AiCoreProviderFactory } from "../providers/ai-core-provider.factory.js";
import { AiProviderCallError, AiProviderCredentialMissingError } from "../errors/ai-core-provider.error.js";
import { NotFoundError } from "../errors/auth.error.js";
import { ApiError } from "../errors/api-error.js";
import { AI_CORE_CACHE_INVALIDATE, aiCoreCacheEvents } from "./ai-cache-invalidation.events.js";
import type { AiCallOutcome } from "../generated/prisma/enums.js";
import type { AiBrain, AiCapability, AiModel, AiPrompt, AiProvider, AiRoutingPolicy } from "../generated/prisma/client.js";
import type { AiCoreMessage, AiCoreProvider } from "../providers/interfaces/ai-core-provider.js";

export interface AiInvokeContext {
  workflowExecutionId?: string;
  workflowName?: string;
  // When true, the model's response is parsed as JSON and a parse failure is
  // classified SCHEMA_INVALID (retryable, corrective retry) — the generic
  // form of ADR-0020's JSON schema contract, business-schema-agnostic in
  // Phase 1 (no CRM-specific field validation lives in AI Core; that is a
  // Brain's own prompt's responsibility). If the parsed object has a
  // top-level numeric `confidence` field, it drives the HIGH/MEDIUM/LOW tier
  // against the Brain's routing policy thresholds — the same generalization
  // of ADR-0020 Decision 6 the TDD describes.
  expectJson?: boolean;
}

export interface AiInvokeOverrides {
  providerId?: string;
  modelId?: string;
  promptVersion?: string;
}

export type AiConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export interface AiInvokeResult {
  output: string;
  outputJson?: unknown;
  capability?: string;
  brain: string;
  provider: string;
  model: string;
  promptVersion: string;
  confidence: AiConfidenceTier | null;
  needsManualReview: boolean;
  outcome: AiCallOutcome;
  retryCount: number;
  latencyMs: number;
}

type PolicyWithRelations = AiRoutingPolicy & {
  preferredProvider: AiProvider;
  preferredModel: AiModel;
  fallbackProvider: AiProvider | null;
  fallbackModel: AiModel | null;
};

interface ResolvedChain {
  brain: AiBrain;
  policy: PolicyWithRelations;
  prompt: AiPrompt;
}

// In-memory, per-process cache — no Redis, no distributed cache (Phase 0.5
// Finding 5/Recommended). Invalidated by AiAuditService's cache-invalidation
// event, not a TTL. A full clear() on any invalidating event is a
// deliberate simplification over per-key eviction: correct, and cheap
// enough at Phase 1's traffic volume that partial invalidation would be
// premature optimization.
class RoutingCache {
  readonly capabilityByKey = new Map<string, AiCapability & { brain: AiBrain }>();
  readonly brainByKey = new Map<string, AiBrain>();
  readonly resolvedByBrainId = new Map<string, { policy: PolicyWithRelations; prompt: AiPrompt }>();

  clear(): void {
    this.capabilityByKey.clear();
    this.brainByKey.clear();
    this.resolvedByBrainId.clear();
  }
}

// The Routing Engine (TDD §8) — the only component that ever talks to
// AiCoreProviderFactory. Resolves Capability -> Brain -> RoutingPolicy ->
// Provider/Model -> Prompt, executes the corrective-retry loop, attempts a
// configured fallback on exhaustion/definitive failure, and never throws an
// unhandled error back to the caller ("never strand a caller" — TDD §8).
export class AiRoutingService {
  private readonly cache = new RoutingCache();

  constructor(
    private readonly capabilityRepository: AiCapabilityRepository = aiCapabilityRepository,
    private readonly brainRepository: AiBrainRepository = aiBrainRepository,
    private readonly routingPolicyRepository: AiRoutingPolicyRepository = aiRoutingPolicyRepository,
    private readonly promptRepository: AiPromptRepository = aiPromptRepository,
    private readonly providerRepository: AiProviderRepository = aiProviderRepository,
    private readonly modelRepository: AiModelRepository = aiModelRepository,
    private readonly providerService: AiProviderService = aiProviderService,
    private readonly usageService: AiUsageService = aiUsageService
  ) {
    aiCoreCacheEvents.on(AI_CORE_CACHE_INVALIDATE, () => this.cache.clear());
  }

  // The one path a business module or n8n workflow ever uses — never a Brain
  // key directly (architecture frozen, ADR-0021).
  async invokeCapability(
    capabilityKey: string,
    input: Record<string, unknown>,
    context: AiInvokeContext,
    actorId: string | null
  ): Promise<AiInvokeResult> {
    const capability = await this.getCapabilityWithBrain(capabilityKey);

    if (!capability.isEnabled) {
      throw new NotFoundError(`AI Capability "${capabilityKey}" is disabled.`);
    }

    const chain = await this.getResolvedChain(capability.brain);
    const result = await this.execute(chain, input, context, actorId, capability.id, false);

    return { ...result, capability: capability.key };
  }

  // Administrative/Playground-only path (aicoreadmin-gated at the route
  // layer) — never reachable by a business-module or n8n service credential.
  async invokeBrain(
    brainKey: string,
    input: Record<string, unknown>,
    context: AiInvokeContext,
    actorId: string | null
  ): Promise<AiInvokeResult> {
    const brain = await this.getBrainByKey(brainKey);
    const chain = await this.getResolvedChain(brain);
    return this.execute(chain, input, context, actorId, null, false);
  }

  // AI Playground (TDD §13) — an override is scoped to this one call only,
  // never persisted to the Brain's actual policy/prompt, and always bypasses
  // the cache so a stale or overridden resolution is never reused.
  async invokePlayground(options: {
    capabilityKey?: string;
    brainKey?: string;
    input: Record<string, unknown>;
    overrides?: AiInvokeOverrides;
    actorId: string;
  }): Promise<AiInvokeResult> {
    let capability: (AiCapability & { brain: AiBrain }) | undefined;
    let brain: AiBrain;

    if (options.capabilityKey) {
      capability = await this.getCapabilityWithBrain(options.capabilityKey);
      brain = capability.brain;
    } else if (options.brainKey) {
      brain = await this.getBrainByKey(options.brainKey);
    } else {
      throw new ApiError(400, "Either capabilityKey or brainKey is required.");
    }

    const baseChain = await this.getResolvedChain(brain);
    const chain = await this.applyOverrides(baseChain, options.overrides);

    const result = await this.execute(chain, options.input, {}, options.actorId, capability?.id ?? null, true);

    return { ...result, capability: capability?.key };
  }

  // --- resolution -----------------------------------------------------

  private async getCapabilityWithBrain(key: string): Promise<AiCapability & { brain: AiBrain }> {
    const cached = this.cache.capabilityByKey.get(key);
    if (cached) return cached;

    const capability = await this.capabilityRepository.findByKeyWithBrain(key);
    if (!capability) {
      throw new NotFoundError(`AI Capability "${key}" not found.`);
    }

    this.cache.capabilityByKey.set(key, capability);
    return capability;
  }

  private async getBrainByKey(key: string): Promise<AiBrain> {
    const cached = this.cache.brainByKey.get(key);
    if (cached) return cached;

    const brain = await this.brainRepository.findByKey(key);
    if (!brain) {
      throw new NotFoundError(`AI Brain "${key}" not found.`);
    }

    this.cache.brainByKey.set(key, brain);
    return brain;
  }

  private async getResolvedChain(brain: AiBrain): Promise<ResolvedChain> {
    const cached = this.cache.resolvedByBrainId.get(brain.id);
    if (cached) return { brain, ...cached };

    const policy = (await this.routingPolicyRepository.findActiveByBrain(brain.id)) as PolicyWithRelations | null;
    if (!policy) {
      throw new NotFoundError(`AI Brain "${brain.key}" has no active routing policy.`);
    }

    const prompt = await this.promptRepository.findActiveByBrain(brain.id);
    if (!prompt) {
      throw new NotFoundError(`AI Brain "${brain.key}" has no active prompt.`);
    }

    this.cache.resolvedByBrainId.set(brain.id, { policy, prompt });
    return { brain, policy, prompt };
  }

  private async applyOverrides(chain: ResolvedChain, overrides?: AiInvokeOverrides): Promise<ResolvedChain> {
    if (!overrides || (!overrides.providerId && !overrides.modelId && !overrides.promptVersion)) {
      return chain;
    }

    let policy = chain.policy;
    let prompt = chain.prompt;

    if (overrides.providerId || overrides.modelId) {
      const providerId = overrides.providerId ?? policy.preferredProviderId;
      const modelId = overrides.modelId ?? policy.preferredModelId;

      const [provider, model] = await Promise.all([
        this.providerRepository.findById(providerId),
        this.modelRepository.findById(modelId),
      ]);

      if (!provider) throw new NotFoundError("Playground override provider not found.");
      if (!model) throw new NotFoundError("Playground override model not found.");

      policy = {
        ...policy,
        preferredProviderId: provider.id,
        preferredProvider: provider,
        preferredModelId: model.id,
        preferredModel: model,
      };
    }

    if (overrides.promptVersion) {
      const overridePrompt = await this.promptRepository.findByBrainAndVersion(chain.brain.id, overrides.promptVersion);
      if (!overridePrompt) {
        throw new NotFoundError(`Prompt version "${overrides.promptVersion}" not found for this brain.`);
      }
      prompt = overridePrompt;
    }

    return { ...chain, policy, prompt };
  }

  // --- execution --------------------------------------------------------

  private async execute(
    chain: ResolvedChain,
    input: Record<string, unknown>,
    context: AiInvokeContext,
    actorId: string | null,
    capabilityId: string | null,
    isPlayground: boolean
  ): Promise<Omit<AiInvokeResult, "capability">> {
    const startedAt = Date.now();
    const expectJson = context.expectJson ?? false;

    let messages = buildMessages(chain.prompt.body, input);
    let retryCount = 0;
    let outcome: AiCallOutcome = "TRANSIENT_FAILURE";
    let lastError: string | undefined;
    let finalContent = "";
    let finalParsed: unknown;

    let providerRow = chain.policy.preferredProvider;
    let modelRow = chain.policy.preferredModel;

    while (retryCount <= chain.policy.maxRetries) {
      try {
        const provider = AiCoreProviderFactory.create(providerRow.key);
        const credentials = await this.resolveCredentialsIfHosted(providerRow, actorId);
        const { content, parsed, jsonParseFailed } = await this.attempt(
          provider,
          messages,
          modelRow.modelKey,
          providerRow.baseUrl,
          credentials,
          expectJson
        );

        if (jsonParseFailed) {
          outcome = "SCHEMA_INVALID";
          lastError = "Model response was not valid JSON.";
          messages = appendCorrective(messages, content, lastError);
          retryCount += 1;
          continue;
        }

        outcome = "VALID";
        finalContent = content;
        finalParsed = parsed;
        break;
      } catch (error) {
        outcome = classifyFailure(error);
        lastError = error instanceof Error ? error.message : "Unknown AI provider error.";

        if (outcome === "DEFINITIVE_FAILURE") break;
        retryCount += 1;
      }
    }

    if (outcome !== "VALID" && chain.policy.fallbackProvider && chain.policy.fallbackModel) {
      try {
        const fallbackProviderRow = chain.policy.fallbackProvider;
        const fallbackModelRow = chain.policy.fallbackModel;
        const fallbackProvider = AiCoreProviderFactory.create(fallbackProviderRow.key);
        const credentials = await this.resolveCredentialsIfHosted(fallbackProviderRow, actorId);
        const { content, parsed, jsonParseFailed } = await this.attempt(
          fallbackProvider,
          messages,
          fallbackModelRow.modelKey,
          fallbackProviderRow.baseUrl,
          credentials,
          expectJson
        );

        if (jsonParseFailed) {
          outcome = "SCHEMA_INVALID";
          lastError = "Fallback response was not valid JSON.";
        } else {
          outcome = "VALID";
          finalContent = content;
          finalParsed = parsed;
          providerRow = fallbackProviderRow;
          modelRow = fallbackModelRow;
        }
      } catch (error) {
        outcome = classifyFailure(error);
        lastError = error instanceof Error ? error.message : "Unknown AI provider error.";
      }
    }

    const confidenceValue = extractConfidence(finalParsed);
    const confidence =
      outcome === "VALID" && confidenceValue !== null ? classifyConfidence(confidenceValue, chain.policy) : null;
    const needsManualReview = outcome !== "VALID" || confidence === "LOW";
    const latencyMs = Date.now() - startedAt;

    const usageData = {
      brainId: chain.brain.id,
      capabilityId,
      providerId: providerRow.id,
      modelId: modelRow.id,
      workflowExecutionId: context.workflowExecutionId ?? null,
      outcome,
      retryCount,
      latencyMs,
      needsManualReview,
      errorMessage: outcome === "VALID" ? null : (lastError ?? null),
    };

    if (isPlayground) {
      await this.usageService.recordPlayground(usageData);
    } else {
      await this.usageService.record(usageData);
    }

    return {
      output: finalContent,
      outputJson: finalParsed,
      brain: chain.brain.key,
      provider: providerRow.key,
      model: modelRow.modelKey,
      promptVersion: chain.prompt.version,
      confidence,
      needsManualReview,
      outcome,
      retryCount,
      latencyMs,
    };
  }

  private async resolveCredentialsIfHosted(
    provider: AiProvider,
    actorId: string | null
  ): Promise<Record<string, unknown> | undefined> {
    if (provider.kind !== "HOSTED") return undefined;
    const credentials = await this.providerService.resolveCredentials(provider.id, actorId);
    return credentials ?? undefined;
  }

  private async attempt(
    provider: AiCoreProvider,
    messages: AiCoreMessage[],
    modelKey: string,
    baseUrl: string | null,
    credentials: Record<string, unknown> | undefined,
    expectJson: boolean
  ): Promise<{ content: string; parsed: unknown; jsonParseFailed: boolean }> {
    const result = await provider.chat(messages, { model: modelKey, baseUrl }, credentials);

    if (!expectJson) {
      return { content: result.content, parsed: undefined, jsonParseFailed: false };
    }

    try {
      return { content: result.content, parsed: extractJson(result.content), jsonParseFailed: false };
    } catch {
      return { content: result.content, parsed: undefined, jsonParseFailed: true };
    }
  }
}

export const aiRoutingService = new AiRoutingService();

// --- pure helpers ---------------------------------------------------------

function buildMessages(promptBody: string, input: Record<string, unknown>): AiCoreMessage[] {
  const rendered = promptBody.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = getPath(input, key);
    return value === undefined ? "" : String(value);
  });

  return [
    { role: "system", content: rendered },
    { role: "user", content: JSON.stringify(input) },
  ];
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function appendCorrective(messages: AiCoreMessage[], badOutput: string, errorMessage: string): AiCoreMessage[] {
  return [
    ...messages,
    { role: "assistant", content: badOutput },
    {
      role: "user",
      content: `That response was invalid: ${errorMessage}. Return corrected JSON only, matching the required schema exactly.`,
    },
  ];
}

// Mirrors the Classify Ollama Result node's extractJson() in
// eyan-automation-hub/workflows/crm/03-ai-qualification.json: strip
// markdown code fences, then extract the first {...} block.
function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  const jsonText = (braceMatch ? braceMatch[0] : candidate).trim();
  return JSON.parse(jsonText);
}

function extractConfidence(parsed: unknown): number | null {
  if (!parsed || typeof parsed !== "object") return null;
  const value = (parsed as Record<string, unknown>).confidence;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function classifyConfidence(confidence: number, policy: Pick<AiRoutingPolicy, "confidenceHighThreshold" | "confidenceMediumThreshold">): AiConfidenceTier {
  if (confidence >= policy.confidenceHighThreshold) return "HIGH";
  if (confidence >= policy.confidenceMediumThreshold) return "MEDIUM";
  return "LOW";
}

// Mirrors the Classify Ollama Result node's outcome classification: 4xx
// (excluding 429) is DEFINITIVE_FAILURE (no retry); everything else
// (network-level failure, 429, 5xx) is TRANSIENT_FAILURE (retryable).
function classifyFailure(error: unknown): AiCallOutcome {
  if (error instanceof AiProviderCredentialMissingError) return "DEFINITIVE_FAILURE";

  if (error instanceof AiProviderCallError) {
    const status = error.providerStatusCode;
    if (status === undefined) return "TRANSIENT_FAILURE";
    if (status === 429 || status >= 500) return "TRANSIENT_FAILURE";
    return "DEFINITIVE_FAILURE";
  }

  return "TRANSIENT_FAILURE";
}

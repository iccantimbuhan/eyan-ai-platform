import type { PrismaClient } from '../src/generated/prisma/client'
import { env } from '../src/config/env'
import { CONTENT_TYPE_AI_CONFIG } from '../src/config/content-prompts'
import { VIDEO_TEXT_KIND_AI_CONFIG } from '../src/config/video-prompts'

// The first production Capability/Brain pair AI Core actually serves real
// traffic to (Sprint 2 — Brain Management Platform). Configuration mirrors
// ADR-0020 (the CRM lead-qualification contract) exactly — same provider,
// model, prompt body, retry count, and confidence thresholds, just
// relocated from n8n-embedded config to AI Core's DB-backed Brain, per
// ADR-0021 §10's "copy-and-relocate, not a rewrite" migration note. Wiring
// eyan-automation-hub's Workflow 3 to actually call this Capability instead
// of Ollama directly is Phase 3 (TDD §18) — out of scope here; this seed
// only makes the Capability invokable over HTTP/Playground.
const OLLAMA_PROVIDER_KEY = 'ollama'
const SALES_QUALIFICATION_MODEL_KEY = env.ollamaModel
const SALES_BRAIN_KEY = 'sales-brain'
const LEAD_QUALIFICATION_CAPABILITY_KEY = 'lead-qualification'

// Verbatim from eyan-automation-hub/workflows/crm/prompts/lead-qualification.v1.md
// (ADR-0020 Decision 2's file-versioning convention) — copied, not rewritten,
// per ADR-0021 §10. The `{{placeholder}}` syntax matches AiRoutingService's
// own prompt-body templating exactly, so this is reusable unchanged.
const LEAD_QUALIFICATION_PROMPT_V1 = `You are a B2B sales lead qualification assistant. Analyze the lead below and
return a single JSON object — nothing else. No prose before or after it, no
markdown code fences, no explanation. Your entire response must be valid JSON
that can be parsed directly.

## Lead

- Contact Name: {{contactName}}
- Email: {{email}}
- Phone: {{phone}}
- Company: {{company}}
- Industry: {{industry}}
- Company Size: {{companySize}}
- Source: {{source}}
- Created At: {{createdAt}}

## Required JSON shape

Return exactly these fields (omit a field only where explicitly marked optional):

\`\`\`json
{
  "leadScore": 0-100,
  "confidence": 0.0-1.0,
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "industry": "string",
  "companySizeEstimate": "string",
  "budgetEstimate": { "min": number, "max": number, "currency": "string" } | null,
  "buyingIntent": "LOW" | "MEDIUM" | "HIGH",
  "urgency": "LOW" | "MEDIUM" | "HIGH",
  "decisionMakerIdentified": true | false,
  "estimatedTimeline": "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM" | "UNKNOWN",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "painPoints": ["string", ...],
  "recommendedAction": "string",
  "summary": "string",
  "reasoning": "string"
}
\`\`\`

## Field guidance

- \`leadScore\`: overall qualification score, 0 (worthless) to 100 (perfect-fit, ready to buy).
- \`confidence\`: YOUR OWN certainty in this analysis, not the lead's quality. A lead with almost no information (e.g. missing company/industry) should get a LOW confidence, even if you still produce your best-guess score — this is what routes uncertain analyses to human review rather than blocking them.
- \`priority\`: how urgently a rep should act, driven by business importance (deal size, fit) — not the same axis as \`urgency\` below.
- \`budgetEstimate\`: your best inferred budget range from the available signals; return \`null\` if there is no reasonable basis to estimate one — do not guess arbitrary numbers.
- \`urgency\`: how time-sensitive a response is — distinct from \`priority\`. A small, low-priority lead can still be urgent (e.g. an explicit deadline mentioned); a high-priority lead can be a long sales cycle with no urgency.
- \`decisionMakerIdentified\`: \`true\` only if the contact plausibly holds buying authority (title, role, or explicit signal) — default \`false\` when unknown, never guess \`true\`.
- \`riskLevel\`: the assessed risk of losing this deal (budget uncertainty, competitor mentions, vague requirements) — distinct from \`confidence\`, which is about your own analysis, not the deal.
- \`painPoints\`: short phrases, empty array if none can be inferred — never fabricate specifics not supported by the lead data.
- \`recommendedAction\`: one concrete next step for the assigned rep.
- \`summary\`: 1-2 sentences a rep can read in passing.
- \`reasoning\`: your justification, referencing the specific lead fields that drove the score.

## Rules

- Every enum field must use exactly one of the listed values — do not invent new values or change casing.
- If information is missing, make a conservative estimate and reflect that uncertainty in a lower \`confidence\` — never omit a required field.
- Return only the JSON object. Any text outside the JSON object will cause your response to be rejected and retried.`

/**
 * Seeds the Ollama AiProvider/AiModel pair, the Sales Qualification Brain
 * (prompt v1 + active routing policy), and the lead-qualification
 * Capability that resolves to it. Idempotent via upsert on each model's
 * natural unique key; AiRoutingPolicy has no natural key (additive-versioned
 * by design, TDD §8), so it's only created the first time a Brain has none.
 */
export async function seedAiCoreFoundation(prisma: PrismaClient): Promise<void> {
  const provider = await prisma.aiProvider.upsert({
    where: { key: OLLAMA_PROVIDER_KEY },
    update: {},
    create: {
      key: OLLAMA_PROVIDER_KEY,
      displayName: 'Ollama (local)',
      kind: 'LOCAL',
      baseUrl: env.ollamaBaseUrl,
      isEnabled: true,
    },
  })

  const model = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: SALES_QUALIFICATION_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: SALES_QUALIFICATION_MODEL_KEY,
      displayName: 'Qwen 2.5 Coder 7B',
      tags: ['chat', 'reasoning', 'coding'],
      isEnabled: true,
    },
  })

  const brain = await prisma.aiBrain.upsert({
    where: { key: SALES_BRAIN_KEY },
    update: {},
    create: {
      key: SALES_BRAIN_KEY,
      name: 'Sales Qualification Brain',
      description: 'Qualifies inbound CRM leads — provider/model/prompt/routing relocated from ADR-0020 unchanged.',
      category: 'Sales',
      memoryStrategy: 'NONE',
      isEnabled: true,
    },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v1' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v1',
      body: LEAD_QUALIFICATION_PROMPT_V1,
      isActive: true,
    },
  })

  const existingPolicy = await prisma.aiRoutingPolicy.findFirst({ where: { brainId: brain.id } })
  if (!existingPolicy) {
    await prisma.aiRoutingPolicy.create({
      data: {
        brainId: brain.id,
        isActive: true,
        strategy: 'BALANCED',
        preferredProviderId: provider.id,
        preferredModelId: model.id,
        // No fallback — ADR-0020 Decision 7 (no automatic cross-provider
        // failover) is deliberately preserved for this specific Brain, even
        // though AI Core's routing engine supports one (ADR-0021 §8).
        fallbackProviderId: null,
        fallbackModelId: null,
        maxRetries: 3,
        // Ollama's real cold-load precedent (OllamaProvider.REQUEST_TIMEOUT_MS),
        // not the schema's hosted-API-oriented 60s default.
        timeoutMs: 300_000,
        confidenceHighThreshold: 0.75,
        confidenceMediumThreshold: 0.4,
      },
    })
  }

  await prisma.aiCapability.upsert({
    where: { key: LEAD_QUALIFICATION_CAPABILITY_KEY },
    update: {},
    create: {
      key: LEAD_QUALIFICATION_CAPABILITY_KEY,
      name: 'Lead Qualification',
      description: 'Analyzes an inbound CRM lead and returns a structured qualification result.',
      brainId: brain.id,
      isEnabled: true,
    },
  })
}

// Sprint 3 Phase 1 migration target for ChatController/ChatService.
const GENERAL_CHAT_MODEL_KEY = env.ollamaModel
const GENERAL_CHAT_BRAIN_KEY = 'general-chat-brain'
const GENERAL_CHAT_CAPABILITY_KEY = 'general-chat'

// Sprint 4 Phase 6 (Model Switching Validation) — additional models
// available on this same Ollama provider so the General Chat Brain's
// Routing Policy can be re-pointed at any of the three installed models
// (create a new AiRoutingPolicy version with a different preferredModelId,
// then activate it) with zero code changes.
const GEMMA_MODEL_KEY = 'gemma3:4b'
const MISTRAL_MODEL_KEY = 'mistral:7b'

/**
 * Seeds the General Chat Brain. As of Sprint 4, ChatService resolves this
 * Brain directly by key — via AiConversationService's "Conversation -> Brain"
 * chain, deliberately skipping the Capability step (the frozen invoke()
 * contract is single-turn/non-streaming; conversations are a different,
 * sprint-4-introduced execution surface) — rather than through the
 * `general-chat` Capability seeded below, which now exists only as a
 * still-usable, ordinary one-shot invoke() Capability for anyone who wants
 * it, not as Chat's own resolution path (Sprint 3's original design).
 */
export async function seedGeneralChatBrain(prisma: PrismaClient): Promise<void> {
  const provider = await prisma.aiProvider.upsert({
    where: { key: OLLAMA_PROVIDER_KEY },
    update: {},
    create: {
      key: OLLAMA_PROVIDER_KEY,
      displayName: 'Ollama (local)',
      kind: 'LOCAL',
      baseUrl: env.ollamaBaseUrl,
      isEnabled: true,
    },
  })

  const model = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: GENERAL_CHAT_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: GENERAL_CHAT_MODEL_KEY,
      displayName: 'Qwen 2.5 Coder 7B',
      tags: ['chat', 'reasoning', 'coding'],
      isEnabled: true,
    },
  })

  await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: GEMMA_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: GEMMA_MODEL_KEY,
      displayName: 'Gemma 3 4B',
      tags: ['chat'],
      isEnabled: true,
    },
  })

  await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: MISTRAL_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: MISTRAL_MODEL_KEY,
      displayName: 'Mistral 7B',
      tags: ['chat', 'reasoning'],
      isEnabled: true,
    },
  })

  const brain = await prisma.aiBrain.upsert({
    where: { key: GENERAL_CHAT_BRAIN_KEY },
    update: {},
    create: {
      key: GENERAL_CHAT_BRAIN_KEY,
      name: 'General Chat Brain',
      description: 'Provider/model configuration for the general-purpose chat assistant (/api/v1/chat, /api/v1/chat/stream).',
      category: 'General',
      memoryStrategy: 'NONE',
      isEnabled: true,
    },
  })

  const existingPolicy = await prisma.aiRoutingPolicy.findFirst({ where: { brainId: brain.id } })
  if (!existingPolicy) {
    await prisma.aiRoutingPolicy.create({
      data: {
        brainId: brain.id,
        isActive: true,
        strategy: 'BALANCED',
        preferredProviderId: provider.id,
        preferredModelId: model.id,
        fallbackProviderId: null,
        fallbackModelId: null,
        // Chat performs no retry today (ChatService throws immediately on
        // failure) — this reflects, not changes, existing behavior.
        maxRetries: 0,
        timeoutMs: 300_000,
        confidenceHighThreshold: 0.75,
        confidenceMediumThreshold: 0.4,
      },
    })
  }

  await prisma.aiCapability.upsert({
    where: { key: GENERAL_CHAT_CAPABILITY_KEY },
    update: {},
    create: {
      key: GENERAL_CHAT_CAPABILITY_KEY,
      name: 'General Chat',
      description: 'Ad-hoc conversational assistant used by ChatController.',
      brainId: brain.id,
      isEnabled: true,
    },
  })
}

const CONTENT_MODEL_KEY = env.ollamaModel

// The instruction every content-type Brain's prompt ends with — clarifies
// that the user's request arrives as the JSON `{{}}`-templating contract
// (AiRoutingService always sends JSON.stringify(input) as the "user"
// message) rather than raw text, and keeps the model's response as plain
// content instead of echoing JSON back.
const CONTENT_INPUT_FORMAT_NOTE =
  'The user\'s request is provided as JSON in the next message under the "prompt" key. Respond directly with the requested content only — no commentary, no JSON, no code fences.'

/**
 * Seeds one Brain per ContentType (Sprint 3 Phase 2 migration target for
 * ContentService.generate()) — a Brain has exactly one active AiPrompt at a
 * time, so five genuinely different system prompts need five Brains, not
 * one shared Brain with a Capability-selected prompt. This also gives each
 * content type independent versioning/tuning from AI Core's UI going
 * forward, which a single shared Brain would not. Config (capability key,
 * brain key, seed prompt text) lives in src/config/content-prompts.ts —
 * the same file ContentService imports from, so the two never drift apart.
 */
export async function seedContentBrains(prisma: PrismaClient): Promise<void> {
  const provider = await prisma.aiProvider.upsert({
    where: { key: OLLAMA_PROVIDER_KEY },
    update: {},
    create: {
      key: OLLAMA_PROVIDER_KEY,
      displayName: 'Ollama (local)',
      kind: 'LOCAL',
      baseUrl: env.ollamaBaseUrl,
      isEnabled: true,
    },
  })

  const model = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: CONTENT_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: CONTENT_MODEL_KEY,
      displayName: 'Qwen 2.5 Coder 7B',
      tags: ['chat', 'reasoning', 'coding'],
      isEnabled: true,
    },
  })

  for (const config of Object.values(CONTENT_TYPE_AI_CONFIG)) {
    const brain = await prisma.aiBrain.upsert({
      where: { key: config.brainKey },
      update: {},
      create: {
        key: config.brainKey,
        name: `${config.displayName} Brain`,
        description: `Provider/model/prompt configuration for ${config.displayName.toLowerCase()} generation (ContentService).`,
        category: 'Content',
        memoryStrategy: 'NONE',
        isEnabled: true,
      },
    })

    await prisma.aiPrompt.upsert({
      where: { brainId_version: { brainId: brain.id, version: 'v1' } },
      update: {},
      create: {
        brainId: brain.id,
        version: 'v1',
        body: `${config.systemPrompt}\n\n{{brandGuidance}}\n\n${CONTENT_INPUT_FORMAT_NOTE}`,
        isActive: true,
      },
    })

    const existingPolicy = await prisma.aiRoutingPolicy.findFirst({ where: { brainId: brain.id } })
    if (!existingPolicy) {
      await prisma.aiRoutingPolicy.create({
        data: {
          brainId: brain.id,
          isActive: true,
          strategy: 'BALANCED',
          preferredProviderId: provider.id,
          preferredModelId: model.id,
          fallbackProviderId: null,
          fallbackModelId: null,
          // Unlike Chat, Content generation goes through AiRoutingService's
          // own execute() loop, so it now gets transient-failure retry for
          // free — a strict resilience improvement over the old ChatService
          // direct-call path, which had none.
          maxRetries: 3,
          timeoutMs: 300_000,
          confidenceHighThreshold: 0.75,
          confidenceMediumThreshold: 0.4,
        },
      })
    }

    await prisma.aiCapability.upsert({
      where: { key: config.capabilityKey },
      update: {},
      create: {
        key: config.capabilityKey,
        name: config.displayName,
        description: `Generates ${config.displayName.toLowerCase()} based on a user prompt.`,
        brainId: brain.id,
        isEnabled: true,
      },
    })
  }
}

const VIDEO_PLANNING_MODEL_KEY = env.ollamaModel
const VIDEO_PLANNING_BRAIN_KEY = 'video-planning-brain'
const VIDEO_PLANNING_CAPABILITY_KEY = 'video-planning'

// Static template shell only — {{operationCatalog}}/{{allowedOperationsLine}}
// are supplied as invoke() input by VideoWorkflowPlannerService at call
// time (derived live from constants/workflow-operations.ts), not baked in
// here, so the executable-operations list can never drift out of sync with
// the Zod validator/execution engine even if this seed is never re-run.
const VIDEO_PLANNING_PROMPT_V1 = `You are a video editing planner. Convert the user's natural-language request into a JSON editing plan.

Source video metadata:
- duration: {{durationMs}} ms
- resolution: {{width}}x{{height}}
- format: {{videoFormat}}

You may ONLY use these operations, each with exactly these parameters:
{{operationCatalog}}

{{allowedOperationsLine}}

Output ONLY a JSON object of this exact shape, and nothing else:
{"steps":[{"operation":"<one of the operations above>","params":{...}}]}

Rules:
- Output ONLY valid JSON. No markdown. No explanations. No prose. No code fences.
- Only use operations from the list above. Never invent a new operation.
- Only include the parameters listed for that operation. Never add extra parameters.
- Order the steps in a sensible execution order.
- The user's editing request is provided as JSON in the next message under the "prompt" key — ignore the other fields in that JSON, they are context only.

{{correctionNotice}}`

/**
 * Seeds the Video Planning Brain (Sprint 3 Phase 3 migration target for
 * VideoWorkflowPlannerService.plan()). maxRetries is deliberately 0: the
 * service itself still owns its 2-attempt corrective-retry loop (Zod
 * validation against the executable-operations catalog is business logic,
 * not something AI Core's generic JSON-parseability retry understands), so
 * each invoke() call here must be exactly one real provider call.
 */
export async function seedVideoPlanningBrain(prisma: PrismaClient): Promise<void> {
  const provider = await prisma.aiProvider.upsert({
    where: { key: OLLAMA_PROVIDER_KEY },
    update: {},
    create: {
      key: OLLAMA_PROVIDER_KEY,
      displayName: 'Ollama (local)',
      kind: 'LOCAL',
      baseUrl: env.ollamaBaseUrl,
      isEnabled: true,
    },
  })

  const model = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: VIDEO_PLANNING_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: VIDEO_PLANNING_MODEL_KEY,
      displayName: 'Qwen 2.5 Coder 7B',
      tags: ['chat', 'reasoning', 'coding'],
      isEnabled: true,
    },
  })

  const brain = await prisma.aiBrain.upsert({
    where: { key: VIDEO_PLANNING_BRAIN_KEY },
    update: {},
    create: {
      key: VIDEO_PLANNING_BRAIN_KEY,
      name: 'Video Planning Brain',
      description: 'Converts a natural-language video edit request into a structured, schema-validated editing plan.',
      category: 'Video',
      memoryStrategy: 'NONE',
      isEnabled: true,
    },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v1' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v1',
      body: VIDEO_PLANNING_PROMPT_V1,
      isActive: true,
    },
  })

  const existingPolicy = await prisma.aiRoutingPolicy.findFirst({ where: { brainId: brain.id } })
  if (!existingPolicy) {
    await prisma.aiRoutingPolicy.create({
      data: {
        brainId: brain.id,
        isActive: true,
        strategy: 'BALANCED',
        preferredProviderId: provider.id,
        preferredModelId: model.id,
        fallbackProviderId: null,
        fallbackModelId: null,
        maxRetries: 0,
        timeoutMs: 300_000,
        confidenceHighThreshold: 0.75,
        confidenceMediumThreshold: 0.4,
      },
    })
  }

  await prisma.aiCapability.upsert({
    where: { key: VIDEO_PLANNING_CAPABILITY_KEY },
    update: {},
    create: {
      key: VIDEO_PLANNING_CAPABILITY_KEY,
      name: 'Video Planning',
      description: 'Plans a structured video edit workflow from a natural-language request.',
      brainId: brain.id,
      isEnabled: true,
    },
  })
}

const VIDEO_TEXT_MODEL_KEY = env.ollamaModel

/**
 * Seeds one Brain per text-generated VideoAssetKind (Sprint 3 Phase 4
 * migration target for VideoAssetService.generateText()) — same one-
 * active-prompt-per-Brain reasoning as seedContentBrains(). Config lives in
 * src/config/video-prompts.ts, the same file VideoAssetService imports
 * from, so the two never drift apart.
 */
export async function seedVideoTextBrains(prisma: PrismaClient): Promise<void> {
  const provider = await prisma.aiProvider.upsert({
    where: { key: OLLAMA_PROVIDER_KEY },
    update: {},
    create: {
      key: OLLAMA_PROVIDER_KEY,
      displayName: 'Ollama (local)',
      kind: 'LOCAL',
      baseUrl: env.ollamaBaseUrl,
      isEnabled: true,
    },
  })

  const model = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: VIDEO_TEXT_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: VIDEO_TEXT_MODEL_KEY,
      displayName: 'Qwen 2.5 Coder 7B',
      tags: ['chat', 'reasoning', 'coding'],
      isEnabled: true,
    },
  })

  for (const config of Object.values(VIDEO_TEXT_KIND_AI_CONFIG)) {
    const brain = await prisma.aiBrain.upsert({
      where: { key: config.brainKey },
      update: {},
      create: {
        key: config.brainKey,
        name: `${config.displayName} Brain`,
        description: `Provider/model/prompt configuration for ${config.displayName.toLowerCase()} generation (VideoAssetService).`,
        category: 'Video',
        memoryStrategy: 'NONE',
        isEnabled: true,
      },
    })

    await prisma.aiPrompt.upsert({
      where: { brainId_version: { brainId: brain.id, version: 'v1' } },
      update: {},
      create: {
        brainId: brain.id,
        version: 'v1',
        body: `${config.systemPrompt}\n\n{{brandGuidance}}\n\n${CONTENT_INPUT_FORMAT_NOTE}`,
        isActive: true,
      },
    })

    const existingPolicy = await prisma.aiRoutingPolicy.findFirst({ where: { brainId: brain.id } })
    if (!existingPolicy) {
      await prisma.aiRoutingPolicy.create({
        data: {
          brainId: brain.id,
          isActive: true,
          strategy: 'BALANCED',
          preferredProviderId: provider.id,
          preferredModelId: model.id,
          fallbackProviderId: null,
          fallbackModelId: null,
          // Same reasoning as seedContentBrains(): free transient-failure
          // retry resilience the old direct ChatService call never had.
          maxRetries: 3,
          timeoutMs: 300_000,
          confidenceHighThreshold: 0.75,
          confidenceMediumThreshold: 0.4,
        },
      })
    }

    await prisma.aiCapability.upsert({
      where: { key: config.capabilityKey },
      update: {},
      create: {
        key: config.capabilityKey,
        name: config.displayName,
        description: `Generates a ${config.displayName.toLowerCase()} based on a user prompt.`,
        brainId: brain.id,
        isEnabled: true,
      },
    })
  }
}

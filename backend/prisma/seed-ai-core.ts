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

// Finance AI Core migration — moves the AI Finance Inbox's two AI-calling
// tasks (intent classification, expense-field extraction) off n8n-embedded
// direct-Ollama calls and onto AI Core, mirroring seedAiCoreFoundation()'s
// CRM precedent. `mistral:7b`/`gemma3:4b` are declared as local constants
// (not imported from the General Chat section below) so this function stays
// self-contained, matching seedContentBrains()/seedVideoPlanningBrain()'s
// own convention of redeclaring their own model-key constant rather than
// cross-importing — both AiModel rows already exist (created by
// seedGeneralChatBrain() for its own, unrelated "model switching
// validation" feature), so these upserts are idempotent no-ops against the
// existing rows, not new AiModel data.
const FINANCE_INTENT_MODEL_KEY = 'mistral:7b'
const FINANCE_INTENT_BRAIN_KEY = 'finance-intent-brain'
const FINANCE_INTENT_CLASSIFICATION_CAPABILITY_KEY = 'finance-intent-classification'

const EXPENSE_EXTRACTION_MODEL_KEY = 'gemma3:4b'
const EXPENSE_EXTRACTION_BRAIN_KEY = 'expense-extraction-brain'
const EXPENSE_EXTRACTION_CAPABILITY_KEY = 'expense-extraction'

// Verbatim from eyan-automation-hub/workflows/finance/prompts/
// intent-classification.v2.md's actual prompt body (everything after that
// file's own header/changelog section), plus one required addition: the
// input-format paragraph below, since v2 was written for n8n's LangChain
// `chainLlm` free-text `text` templating, not AI Core's
// `JSON.stringify(input)`-as-user-message convention (buildMessages() in
// ai-routing.service.ts). Versioned 'v1' here, not 'v2' — AiPrompt.version
// is scoped per-brainId (@@unique([brainId, version])), and this is the
// first prompt version this Brain has ever had; every other seed function
// in this file starts its first prompt at 'v1' regardless of the source
// prompt's own prior history (mirrors LEAD_QUALIFICATION_PROMPT_V1 above).
const FINANCE_INTENT_CLASSIFICATION_PROMPT_V1 = `You are the Finance Intent Router's classifier for the AI Finance Inbox. Read the user's message and decide which ONE Finance intent it belongs to.

Supported intents — choose exactly one:

- CREATE_EXPENSE: the user is describing money they spent (e.g. "spent $12 on lunch", "bought groceries for 45").
- GET_BUDGET: the user is asking about their configured monthly budget limit (e.g. "what's my budget?").
- GET_DASHBOARD: the user is asking for a spending summary or overview (e.g. "how am I doing this month?", "show my spending").
- GET_FINANCE_QUESTION: an open-ended finance question not covered by GET_BUDGET or GET_DASHBOARD (e.g. "am I overspending on food?", "what's my biggest expense category?").
- CREATE_INCOME: the user is describing money they received (e.g. "got paid $2000", "received a refund of $30").
- CREATE_TRANSFER: the user is describing money moved between accounts or people, not spent or earned (e.g. "sent $50 to Alex", "transferred money to savings").
- UPLOAD_RECEIPT: the message clearly references a shared image or attachment that is a receipt.
- UNRECOGNIZED: the message does not clearly fit any of the above, or is genuinely ambiguous between two intents.

The user's message is provided as JSON in the next message under the "message" key (an optional "attachmentCount" field is also present — a nonzero value means the user shared one or more attachments alongside the message). Respond directly with the JSON object described below only — no commentary, no code fences.

Output format — follow this exactly:

- Return JSON only. Your entire response must be exactly one JSON object and nothing else.
- Do not wrap the JSON in Markdown code fences or any other formatting.
- Do not include explanations, reasoning, commentary, or any text before or after the JSON object.
- Do not use tool calls, function calls, or any structured-output mechanism other than writing the JSON object directly as your response text.
- The object must contain exactly these two fields, and no others: \`intent\` and \`confidence\`. Do not invent additional fields. Do not extract amounts, categories, dates, counterparties, or any other Finance-specific field — that is a downstream Handler workflow's job, never yours.

The required shape:

\`\`\`json
{"intent": "CREATE_EXPENSE", "confidence": 0.97}
\`\`\`

Rules for the two fields:

- \`intent\` must be exactly one of the eight supported intent values listed above — never a value outside that list.
- \`confidence\` must be a plain number between 0 and 1 (inclusive).

Rules for ambiguity — read carefully, these matter more than getting a "confident-sounding" answer:

- Use UNRECOGNIZED when the message does not clearly match any listed intent (small talk, unrelated questions, requests unrelated to Finance).
- Prefer UNRECOGNIZED over guessing whenever the message is genuinely ambiguous between two intents. A wrong guess is worse than asking the user to clarify.
- Do not guess between CREATE_EXPENSE and CREATE_TRANSFER when the message could plausibly be either (e.g. money sent to a person could be a personal expense or a transfer) — use UNRECOGNIZED instead.
- Do not guess between CREATE_INCOME and CREATE_EXPENSE when the direction of money movement is unclear (e.g. a refund or reversal could read as either) — use UNRECOGNIZED instead.
- Do not guess whether an attachment is a receipt when the intent is otherwise unclear from the message — use UNRECOGNIZED instead, even if an attachment is present.

Examples:

Message: "spent $12.50 on lunch"
\`{"intent": "CREATE_EXPENSE", "confidence": 0.95}\`

Message: "what's my budget this month?"
\`{"intent": "GET_BUDGET", "confidence": 0.95}\`

Message: "how am I doing this month?"
\`{"intent": "GET_DASHBOARD", "confidence": 0.9}\`

Message: "am I overspending on food?"
\`{"intent": "GET_FINANCE_QUESTION", "confidence": 0.9}\`

Message: "got paid $2000"
\`{"intent": "CREATE_INCOME", "confidence": 0.95}\`

Message: "sent $50 to Alex"
\`{"intent": "CREATE_TRANSFER", "confidence": 0.85}\`

Message: [no text, one image attachment, no other context]
\`{"intent": "UPLOAD_RECEIPT", "confidence": 0.8}\`

Message: "hey how's it going?"
\`{"intent": "UNRECOGNIZED", "confidence": 0.9}\`

Message: "sent $50 to Alex for dinner" (ambiguous — could be a transfer to a person or a personal expense; do not guess)
\`{"intent": "UNRECOGNIZED", "confidence": 0.55}\`

Message: "got $30 back from a return" (ambiguous — could be income or a reversed expense; do not guess)
\`{"intent": "UNRECOGNIZED", "confidence": 0.5}\`

Message: [one image attachment, caption "check this out"] (attachment present but nothing indicates it is a receipt; do not guess)
\`{"intent": "UNRECOGNIZED", "confidence": 0.4}\`

Respond with the JSON object only.`

// Verbatim from eyan-automation-hub/workflows/finance/prompts/
// expense-extraction.v3.md's actual prompt body (the part sent to the
// model — that file's own "Fields NOT extracted" and "Ollama request
// configuration" sections are human documentation only, never part of the
// literal systemPrompt string the n8n node built), plus two required
// changes: the same input-format paragraph as above, and `${today}`
// (a JS template-literal interpolation baked in at n8n-build time) becomes
// a static `{{today}}` AI Core placeholder — buildMessages() in
// ai-routing.service.ts resolves `{{today}}` from `input.today` per call,
// the same convention VIDEO_PLANNING_PROMPT_V1's `{{durationMs}}` already
// uses — so the workflow must now pass `today` as an `input` field instead
// of interpolating it into the prompt string itself. Versioned 'v1', not
// 'v3' — same reasoning as FINANCE_INTENT_CLASSIFICATION_PROMPT_V1 above.
const EXPENSE_EXTRACTION_PROMPT_V1 = `You are the Finance CREATE_EXPENSE Handler's expense-field extractor for the AI Finance Inbox. Your ONLY job is to read the user's raw message and extract the fields needed to log an expense. Intent classification is already done (this message was already routed here as CREATE_EXPENSE) -- you do not classify intent, do not answer questions, and have no access to any Finance data.

The user's message is provided as JSON in the next message under the "message" key (an optional "attachmentCount" field is also present — a nonzero value means the user shared one or more attachments alongside the message). Respond directly with the JSON object described below only — no commentary, no code fences.

Extract exactly these fields:

- amount: the numeric amount spent, as a plain number (e.g. 12.50). null if no amount is mentioned or it cannot be determined -- NEVER invent or guess a number.
- category: EXACTLY one of these values: HOUSING, FOOD, UTILITIES, TRANSPORTATION, SHOPPING, MEDICAL, CREDIT_CARD, SAVINGS, TAX, OTHERS. No other value is valid -- for example, "Food & Drink" is NOT a valid category; the closest real value is FOOD. null if the category cannot be confidently determined -- NEVER guess between two plausible categories, and NEVER invent a category value that is not in this exact list.
- paymentMethod: EXACTLY one of these values, or null if not mentioned: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, OTHER. No other value is valid -- for example, "Imagin Card" is NOT a valid paymentMethod. Named cards and payment instruments ("Imagin", "Visa", "Mastercard", "Amex", "Revolut", or similar) are not paymentMethod values themselves -- when the message names one of these to describe how something was paid, map it to CREDIT_CARD, unless the message specifically says it is a debit card, in which case use DEBIT_CARD.
- date: the date the expense occurred, as YYYY-MM-DD. "today" is NOT a valid date output -- always resolve it to an actual calendar date. If the message implies today (or gives no date at all), use {{today}}. If it says "yesterday", use the day before {{today}}. Use your best resolution of any other relative or explicit date mentioned.
- description: a short (under 100 characters) plain-text description of what the expense was for, drawing on the message's own wording (e.g. merchant, item). null if the message gives nothing beyond the amount.
- isRecurring: true ONLY if the message clearly and explicitly describes a repeating or recurring expense (e.g. "my monthly Netflix subscription", "rent, same as every month", "this happens every month"). false if the message describes a one-time expense, or does not mention recurrence at all. NEVER guess true from an ambiguous or unstated case -- default to false.

Note: "CREDIT_CARD" appears as a value in BOTH category and paymentMethod -- they are two separate fields. A message about paying a credit card BILL is category CREDIT_CARD; a message about paying an unrelated expense BY credit card is paymentMethod CREDIT_CARD (with category describing what was bought).

Output rules -- follow every one of these exactly:
- Never invent an amount. If it cannot be determined, use null.
- Never invent a category. If it cannot be confidently determined, use null -- do not pick the closest guess.
- Never output markdown, code fences, or any text other than the JSON object.
- Return exactly one JSON object with exactly these six keys (amount, category, paymentMethod, date, description, isRecurring) and no other text, no explanation.`

/**
 * Seeds the Finance Intent Classification Brain and the Expense Extraction
 * Brain — the two AI Finance Inbox tasks previously called directly against
 * Ollama from eyan-automation-hub (`workflows/finance/02-finance-intent-router.json`,
 * `workflows/finance/10-handle-create-expense.json`; see ADR-0011/ADR-0012
 * there), now relocated to AI Core so n8n becomes orchestration-only for
 * both, mirroring how CRM's Workflow 3 already calls `lead-qualification`.
 * Two Brains, not one shared Brain — same one-active-prompt-per-Brain
 * reasoning as seedContentBrains(), and the two tasks use different models.
 */
export async function seedFinanceBrains(prisma: PrismaClient): Promise<void> {
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

  const intentModel = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: FINANCE_INTENT_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: FINANCE_INTENT_MODEL_KEY,
      displayName: 'Mistral 7B',
      tags: ['chat', 'reasoning'],
      isEnabled: true,
    },
  })

  const extractionModel = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: EXPENSE_EXTRACTION_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: EXPENSE_EXTRACTION_MODEL_KEY,
      displayName: 'Gemma 3 4B',
      tags: ['chat'],
      isEnabled: true,
    },
  })

  const intentBrain = await prisma.aiBrain.upsert({
    where: { key: FINANCE_INTENT_BRAIN_KEY },
    update: {},
    create: {
      key: FINANCE_INTENT_BRAIN_KEY,
      name: 'Finance Intent Classification Brain',
      description: 'Classifies inbound AI Finance Inbox messages into one of eight supported Finance intents.',
      category: 'Finance',
      memoryStrategy: 'NONE',
      isEnabled: true,
    },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: intentBrain.id, version: 'v1' } },
    update: {},
    create: {
      brainId: intentBrain.id,
      version: 'v1',
      body: FINANCE_INTENT_CLASSIFICATION_PROMPT_V1,
      isActive: true,
    },
  })

  const existingIntentPolicy = await prisma.aiRoutingPolicy.findFirst({ where: { brainId: intentBrain.id } })
  if (!existingIntentPolicy) {
    await prisma.aiRoutingPolicy.create({
      data: {
        brainId: intentBrain.id,
        isActive: true,
        strategy: 'BALANCED',
        preferredProviderId: provider.id,
        preferredModelId: intentModel.id,
        // No fallback — matches every other Brain seeded in this file; no
        // second provider/model pairing exists to fall back to today.
        fallbackProviderId: null,
        fallbackModelId: null,
        // The Router had zero retry (ADR-0012 removed the old retry
        // taxonomy) and no confidence-threshold routing at all — this is a
        // deliberate behavior addition, not a preserved value. See
        // ADR-0014's discussion of this decision.
        maxRetries: 3,
        timeoutMs: 300_000,
        confidenceHighThreshold: 0.75,
        confidenceMediumThreshold: 0.4,
      },
    })
  }

  await prisma.aiCapability.upsert({
    where: { key: FINANCE_INTENT_CLASSIFICATION_CAPABILITY_KEY },
    update: {},
    create: {
      key: FINANCE_INTENT_CLASSIFICATION_CAPABILITY_KEY,
      name: 'Finance Intent Classification',
      description: 'Classifies an inbound Finance Inbox message into one of eight supported intents.',
      brainId: intentBrain.id,
      isEnabled: true,
    },
  })

  const extractionBrain = await prisma.aiBrain.upsert({
    where: { key: EXPENSE_EXTRACTION_BRAIN_KEY },
    update: {},
    create: {
      key: EXPENSE_EXTRACTION_BRAIN_KEY,
      name: 'Expense Extraction Brain',
      description: 'Extracts structured expense fields (amount/category/paymentMethod/date/description/isRecurring) from a CREATE_EXPENSE message.',
      category: 'Finance',
      memoryStrategy: 'NONE',
      isEnabled: true,
    },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: extractionBrain.id, version: 'v1' } },
    update: {},
    create: {
      brainId: extractionBrain.id,
      version: 'v1',
      body: EXPENSE_EXTRACTION_PROMPT_V1,
      isActive: true,
    },
  })

  const existingExtractionPolicy = await prisma.aiRoutingPolicy.findFirst({ where: { brainId: extractionBrain.id } })
  if (!existingExtractionPolicy) {
    await prisma.aiRoutingPolicy.create({
      data: {
        brainId: extractionBrain.id,
        isActive: true,
        strategy: 'BALANCED',
        preferredProviderId: provider.id,
        preferredModelId: extractionModel.id,
        fallbackProviderId: null,
        fallbackModelId: null,
        maxRetries: 3,
        // 300s, not the Handler's current 90s httpRequest timeout — this
        // Brain's own maxRetries:3 means a slow call plus retries could
        // legitimately need longer than 90s to reach a final answer, and
        // 300s only changes the abort ceiling (matches every other seeded
        // policy), not typical latency. The n8n workflow's own httpRequest
        // node timeout must be set to >= this value or it will abort the
        // call before this policy's retry loop can finish.
        timeoutMs: 300_000,
        // Seeded for consistency with every other Brain, but currently
        // inert: this prompt has no `confidence` field (deliberate — see
        // ADR-0014), so extractConfidence() always returns null for this
        // Brain and these thresholds are never evaluated.
        confidenceHighThreshold: 0.75,
        confidenceMediumThreshold: 0.4,
      },
    })
  }

  await prisma.aiCapability.upsert({
    where: { key: EXPENSE_EXTRACTION_CAPABILITY_KEY },
    update: {},
    create: {
      key: EXPENSE_EXTRACTION_CAPABILITY_KEY,
      name: 'Expense Extraction',
      description: 'Extracts structured expense-log fields from a CREATE_EXPENSE Finance Inbox message.',
      brainId: extractionBrain.id,
      isEnabled: true,
    },
  })
}

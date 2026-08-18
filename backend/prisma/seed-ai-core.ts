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

const FINANCE_QUESTION_MODEL_KEY = 'mistral:7b'
const FINANCE_QUESTION_BRAIN_KEY = 'finance-question-brain'
const FINANCE_QUESTION_CAPABILITY_KEY = 'finance-question'

const FINANCE_QUESTION_PROMPT_V1 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the dashboard data supplied to you -- you do not classify intent, do not extract expense fields, and have no access to any Finance data beyond what is given to you in this call.

The user's question and the authoritative dashboard data are provided as JSON in the next message, under two keys:

- "question": the user's raw natural-language question (e.g. "am I overspending on food?").
- "dashboard": the current period's real Finance data -- { period, budget: {monthlyLimit} | null, totalExpenses, remainingBudget, categoryBreakdown: [{category, total}], spendingTrend: [{period, total}], recentExpenses: [{amount, category, description, date}] }.

The "dashboard" object is the ONLY source of truth for any number, category, or expense you mention. It is authoritative and complete for the current period -- treat it as the entire Finance record available to you.

Output rules -- follow every one of these exactly:

- Answer only from the supplied "dashboard" data. Never invent, estimate, or assume any financial number, category, or expense that is not explicitly present in it.
- If the dashboard does not contain enough information to answer the question (e.g. it asks about a category with no matching row in categoryBreakdown/recentExpenses, or a comparison the data does not cover), say so plainly rather than fabricate an answer.
- Never claim information -- an amount, a date, a merchant, a trend -- that is not literally present in the supplied JSON.
- You are answering a question only. Never suggest, imply, or describe performing any financial mutation (creating, updating, or deleting an expense, budget, income, or transfer) -- you have no ability to do so and must never claim otherwise.
- Keep the answer concise (2-4 sentences) and written in plain, natural language suitable for a WhatsApp reply -- no markdown, no code fences, no bullet lists, no JSON.
- Respond with the answer text only -- no preamble like "Based on the data provided", no meta-commentary about your own reasoning process.

Examples:

question: "Am I overspending on food?"
dashboard: { "period": "2026-08", "budget": {"monthlyLimit": "1500.00"}, "totalExpenses": "726.72", "remainingBudget": "773.28", "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"76.72"}] }
Answer: "Food is your second-largest category this month at $76.72, well behind Housing's $650.00 -- you're not overspending there, and you still have $773.28 left in your $1500.00 budget overall."

question: "How much have I spent on travel this month?"
dashboard: { "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"76.72"}] }
Answer: "I don't see any Travel or Transportation expenses recorded for this month in your data, so I can't give you a spent amount for that category."

Respond with the answer text only.`

// v2 -- see seedFinanceQuestionBrain()'s own comment on the v2 addendum
// for the real live-WhatsApp failure this version fixes: a fabricated
// "Transportation" category, an impossible "third-largest" ranking with
// only two real categoryBreakdown entries, and a percentage rounded past a
// threshold it did not reach. Structure mirrors v1's throughout (same
// role/scope sentence, same input-shape explanation, same grounding
// premise, same WhatsApp-conciseness/no-quotation-marks output rules) --
// this version only adds a new "Grounding and accuracy rules" section
// naming the exact failure classes observed, and replaces v1's single
// worked example with one that reproduces the real failing payload
// verbatim and shows the correct reasoning/answer for it.
const FINANCE_QUESTION_PROMPT_V2 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the dashboard data supplied to you -- you do not classify intent, do not extract expense fields, and have no access to any Finance data beyond what is given to you in this call.

The user's question and the authoritative dashboard data are provided as JSON in the next message, under two keys:

- "question": the user's raw natural-language question (e.g. "am I overspending on food?").
- "dashboard": the current period's real Finance data -- { period, budget: {monthlyLimit} | null, totalExpenses, remainingBudget, categoryBreakdown: [{category, total}], spendingTrend: [{period, total}], recentExpenses: [{amount, category, description, date}] }.

The "dashboard" object is the ONLY source of truth for any number, category, or expense you mention. It is authoritative and complete for the current period -- treat it as the entire Finance record available to you.

Grounding and accuracy rules -- these are the most common ways an answer goes wrong, follow every one of them exactly:

- Never mention a category name unless that exact category appears in dashboard.categoryBreakdown or dashboard.recentExpenses. If the user asks about a category that is not present in either array (e.g. they ask about "travel" and no TRANSPORTATION entry exists), say plainly that you have no recorded spending in that category -- never invent one to fill the gap.
- Never invent a category, amount, merchant, date, or trend that is not literally present in the supplied JSON. This includes never adding an extra category to a ranking or comparison beyond what categoryBreakdown actually contains.
- When ranking or comparing categories ("biggest", "smallest", "second-largest", etc.), sort and count ONLY the entries actually present in dashboard.categoryBreakdown. Never call something "third-largest" (or any ordinal) unless dashboard.categoryBreakdown actually contains at least that many entries -- if categoryBreakdown has only two entries, the only valid ordinals are "largest"/"first" and "second-largest"/"smallest", nothing beyond that.
- When calculating a percentage (e.g. a category's share of the budget or of total spending), compute it precisely from the supplied numbers (amount ÷ monthlyLimit × 100, or amount ÷ totalExpenses × 100, as the question requires) and state it accurately. Do not round in a direction that crosses a whole-number threshold you did not actually reach -- for example, $145.42 out of a $1500.00 budget is 9.69%, which must be described as "under 10%" or "about 9.7%", never as "over 10%".
- If the question asks whether the user is "overspending" or "spending too much" and the dashboard contains no per-category limit or threshold (only an overall monthlyLimit, if any), do not invent a category-specific limit to judge against. Instead, state the real numbers you do have (the category's spending, its share of the total or of the overall budget) and say plainly that no specific threshold exists in the data to judge "overspending" against for that category.
- Dashboard data is the sole source of truth for every number, category, and expense you state -- nothing outside it may be referenced or assumed.

Output rules -- follow every one of these exactly:

- Keep the answer concise (2-4 sentences) and written in plain, natural language suitable for a WhatsApp reply -- no markdown, no code fences, no bullet lists, no JSON.
- Respond with the answer text only -- no preamble like "Based on the data provided", no meta-commentary about your own reasoning process, and do NOT wrap your answer in quotation marks.

Worked example -- reproduces a real failure this prompt version fixes, follow this reasoning exactly for a similarly-shaped case:

question: "Am I overspending on food?"
dashboard: { "budget": {"monthlyLimit": "1500.00"}, "totalExpenses": "795.42", "remainingBudget": "704.58", "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"}] }

Correct reasoning: categoryBreakdown has exactly two entries, HOUSING ($650.00) and FOOD ($145.42) -- there is no third category, so FOOD can only be described as your second-largest (or smallest) category, never "third-largest", and no other category (e.g. Transportation) may be mentioned since none exists in the data. FOOD's share of the $1500.00 budget is 145.42 ÷ 1500.00 × 100 = 9.69%, which is under 10%, not over it. The dashboard has no per-category spending limit, so there is no threshold in the data to judge "overspending on food" against.

Correct answer: Food is your second-largest category this month at $145.42, behind Housing's $650.00 -- that's about 9.7% of your $1500.00 budget. There's no specific food budget limit in your data to compare against, but you still have $704.58 left overall.

Additional example:

question: "How much have I spent on travel this month?"
dashboard: { "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"76.72"}] }
Answer: I don't see any Travel or Transportation expenses recorded for this month in your data, so I can't give you a spent amount for that category.

Respond with the answer text only.`

// v3 -- see seedFinanceQuestionBrain()'s own comment on the v3 addendum
// for the two real failures observed in v2's regression suite: a scrambled
// three-category ranking, and a percentage answered against the wrong
// denominator (totalExpenses instead of monthlyLimit, or vice versa).
// Adds two new rule sections ("Ranking and comparison rules",
// "Percentage calculation rules") and two new worked examples reproducing
// each failure verbatim, on top of v2's unchanged grounding/output rules
// and its own two worked examples.
const FINANCE_QUESTION_PROMPT_V3 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the dashboard data supplied to you -- you do not classify intent, do not extract expense fields, and have no access to any Finance data beyond what is given to you in this call.

The user's question and the authoritative dashboard data are provided as JSON in the next message, under two keys:

- "question": the user's raw natural-language question (e.g. "am I overspending on food?").
- "dashboard": the current period's real Finance data -- { period, budget: {monthlyLimit} | null, totalExpenses, remainingBudget, categoryBreakdown: [{category, total}], spendingTrend: [{period, total}], recentExpenses: [{amount, category, description, date}] }.

The "dashboard" object is the ONLY source of truth for any number, category, or expense you mention. It is authoritative and complete for the current period -- treat it as the entire Finance record available to you.

Grounding and accuracy rules -- these are the most common ways an answer goes wrong, follow every one of them exactly:

- Never mention a category name unless that exact category appears in dashboard.categoryBreakdown or dashboard.recentExpenses. If the user asks about a category that is not present in either array (e.g. they ask about "travel" and no TRANSPORTATION entry exists), say plainly that you have no recorded spending in that category -- never invent one to fill the gap.
- Never invent a category, amount, merchant, date, or trend that is not literally present in the supplied JSON. This includes never adding an extra category to a ranking or comparison beyond what categoryBreakdown actually contains.
- If the question asks whether the user is "overspending" or "spending too much" and the dashboard contains no per-category limit or threshold (only an overall monthlyLimit, if any), do not invent a category-specific limit to judge against. Instead, state the real numbers you do have (the category's spending, its share of the total or of the overall budget) and say plainly that no specific threshold exists in the data to judge "overspending" against for that category.
- Dashboard data is the sole source of truth for every number, category, and expense you state -- nothing outside it may be referenced or assumed.

Ranking and comparison rules -- follow these exactly whenever a question asks which category is largest/highest/biggest, smallest/lowest, or asks you to compare or rank categories:

- Inspect every entry in dashboard.categoryBreakdown -- never skip one.
- Compare the numeric \`total\` values of the entries directly against each other. Never infer order from the position an entry happens to appear in the JSON array -- array order is not sorted order and carries no ranking information.
- For "largest"/"highest"/"biggest" questions, sort the entries in descending order by \`total\`. For "smallest"/"lowest" questions, sort in ascending order.
- Before stating that one category is "behind," "ahead of," "larger than," or "smaller than" another, verify that relationship by comparing their actual numeric \`total\` values -- never state a behind/ahead relationship unless the numbers actually establish it.
- Only use an ordinal word ("second-largest," "third-largest," etc.) when dashboard.categoryBreakdown actually contains at least that many entries, AND only assign it to the category the numeric comparison actually places there.

Percentage calculation rules -- follow these exactly whenever a question asks for a percentage or share:

- If the question asks what percentage/share/portion of your BUDGET (e.g. "percentage of my budget," "what percent of my budget," "how much of my budget") a category or amount represents, the denominator MUST be dashboard.budget.monthlyLimit.
- If the question asks what percentage/share of your TOTAL SPENDING (e.g. "percentage of my spending," "what percent of what I've spent," "share of total expenses") a category represents, the denominator MUST be dashboard.totalExpenses.
- The numerator is the specific category's \`total\` (from categoryBreakdown) when the question asks about that category, or the relevant amount the question asks about otherwise.
- Never substitute totalExpenses for monthlyLimit when the question explicitly asks about the budget, and never substitute monthlyLimit for totalExpenses when the question explicitly asks about total spending -- these are two different real numbers in the supplied JSON that answer two different questions.
- If dashboard.budget is null and the question requires monthlyLimit as the denominator, say plainly that this percentage cannot be calculated because no budget is set for this period -- never substitute a different number instead.
- Work out the calculation internally before answering, but never show your work, formulas, or step-by-step reasoning in the final response -- state only the concise conclusion.

Output rules -- follow these exactly:

- Keep the answer concise (2-4 sentences) and written in plain, natural language suitable for a WhatsApp reply -- no markdown, no code fences, no bullet lists, no JSON.
- Respond with the answer text only -- no preamble like "Based on the data provided", no meta-commentary about your own reasoning process, no exposed calculation/formulas, and do NOT wrap your answer in quotation marks.

Worked example -- reproduces a real failure this prompt fixes (grounding + no invented threshold):

question: "Am I overspending on food?"
dashboard: { "budget": {"monthlyLimit": "1500.00"}, "totalExpenses": "795.42", "remainingBudget": "704.58", "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"}] }

Correct reasoning: categoryBreakdown has exactly two entries, HOUSING ($650.00) and FOOD ($145.42) -- there is no third category, so FOOD can only be described as your second-largest (or smallest) category, never "third-largest", and no other category (e.g. Transportation) may be mentioned since none exists in the data. FOOD's share of the $1500.00 budget is 145.42 ÷ 1500.00 × 100 = 9.69%, which is under 10%, not over it. The dashboard has no per-category spending limit, so there is no threshold in the data to judge "overspending on food" against.

Correct answer: Food is your second-largest category this month at $145.42, behind Housing's $650.00 -- that's about 9.7% of your $1500.00 budget. There's no specific food budget limit in your data to compare against, but you still have $704.58 left overall.

Worked example -- three-category ranking, reproduces a second real failure this prompt fixes (ranking/ordering):

dashboard.categoryBreakdown: [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"},{"category":"TRANSPORTATION","total":"13.90"}]

Correct reasoning: compare all three totals numerically: 650.00 > 145.42 > 13.90. Descending order is HOUSING (1st, largest), FOOD (2nd, second-largest), TRANSPORTATION (3rd, smallest). Food is the second-largest category, NOT the third-largest, and Food ($145.42) is well ahead of Transportation ($13.90) -- never behind it. A ranking answer for this data must reflect exactly this order.

Worked example -- percentage of budget vs. percentage of total spending (these are NOT the same question, reproduces a third real failure this prompt fixes):

dashboard: { "budget": {"monthlyLimit": "1500.00"}, "totalExpenses": "809.32", "categoryBreakdown": [{"category":"FOOD","total":"145.42"}] }

question: "What percentage of my budget have I spent on food?" -> the denominator is monthlyLimit (the question says "budget"): 145.42 ÷ 1500.00 × 100 = 9.69%. Correct answer states approximately 9.7% of the budget.

A DIFFERENT question, "What percentage of my total spending is food?", would use totalExpenses instead (the question says "total spending"): 145.42 ÷ 809.32 × 100 = 17.97% -- a different real number answering a different real question. Never answer a budget-percentage question with the total-spending percentage, or vice versa.

Additional example -- a category absent from the data:

question: "How much have I spent on travel this month?"
dashboard: { "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"76.72"}] }
Answer: I don't see any Travel or Transportation expenses recorded for this month in your data, so I can't give you a spent amount for that category.

Respond with the answer text only.`

// v4 -- see seedFinanceQuestionBrain()'s own comment on the v4 addendum
// for the two remaining issues v3's regression suite surfaced: (1) a
// missing-budget question silently substituted totalExpenses instead of
// declining (the one blocking failure), and (2) a valid budget-percentage
// answer exposed its own arithmetic ("145.42/1500.00 * 100 = ...") despite
// the numeric result being correct, against the explicit "never show your
// work" rule. Adds a hard-stop instruction for the missing-denominator
// case, a dedicated "Calculation-output safety rules" section banning
// exposed formulas/equations/working, and worked examples reproducing both
// failures with explicit correct/incorrect contrast pairs -- on top of
// v3's unchanged grounding/ranking/percentage-denominator rules.
const FINANCE_QUESTION_PROMPT_V4 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the dashboard data supplied to you -- you do not classify intent, do not extract expense fields, and have no access to any Finance data beyond what is given to you in this call.

The user's question and the authoritative dashboard data are provided as JSON in the next message, under two keys:

- "question": the user's raw natural-language question (e.g. "am I overspending on food?").
- "dashboard": the current period's real Finance data -- { period, budget: {monthlyLimit} | null, totalExpenses, remainingBudget, categoryBreakdown: [{category, total}], spendingTrend: [{period, total}], recentExpenses: [{amount, category, description, date}] }.

The "dashboard" object is the ONLY source of truth for any number, category, or expense you mention. It is authoritative and complete for the current period -- treat it as the entire Finance record available to you.

Grounding and accuracy rules -- these are the most common ways an answer goes wrong, follow every one of them exactly:

- Never mention a category name unless that exact category appears in dashboard.categoryBreakdown or dashboard.recentExpenses. If the user asks about a category that is not present in either array (e.g. they ask about "travel" and no TRANSPORTATION entry exists), say plainly that you have no recorded spending in that category -- never invent one to fill the gap.
- Never invent a category, amount, merchant, date, or trend that is not literally present in the supplied JSON. This includes never adding an extra category to a ranking or comparison beyond what categoryBreakdown actually contains.
- If the question asks whether the user is "overspending" or "spending too much" and the dashboard contains no per-category limit or threshold (only an overall monthlyLimit, if any), do not invent a category-specific limit to judge against. Instead, state the real numbers you do have (the category's spending, its share of the total or of the overall budget) and say plainly that no specific threshold exists in the data to judge "overspending" against for that category.
- Dashboard data is the sole source of truth for every number, category, and expense you state -- nothing outside it may be referenced or assumed.

Ranking and comparison rules -- follow these exactly whenever a question asks which category is largest/highest/biggest, smallest/lowest, or asks you to compare or rank categories:

- Inspect every entry in dashboard.categoryBreakdown -- never skip one.
- Compare the numeric total values of the entries directly against each other. Never infer order from the position an entry happens to appear in the JSON array -- array order is not sorted order and carries no ranking information.
- For "largest"/"highest"/"biggest" questions, sort the entries in descending order by total. For "smallest"/"lowest" questions, sort in ascending order.
- Before stating that one category is "behind," "ahead of," "larger than," or "smaller than" another, verify that relationship by comparing their actual numeric total values -- never state a behind/ahead relationship unless the numbers actually establish it.
- Only use an ordinal word ("second-largest," "third-largest," etc.) when dashboard.categoryBreakdown actually contains at least that many entries, AND only assign it to the category the numeric comparison actually places there.

Percentage calculation rules -- follow these exactly whenever a question asks for a percentage or share:

- If the question asks what percentage/share/portion of your BUDGET (e.g. "percentage of my budget," "what percent of my budget," "how much of my budget") a category or amount represents, the denominator MUST be dashboard.budget.monthlyLimit.
- If the question asks what percentage/share of your TOTAL SPENDING (e.g. "percentage of my spending," "what percent of what I've spent," "share of total expenses") a category represents, the denominator MUST be dashboard.totalExpenses.
- The numerator is the specific category's total (from categoryBreakdown) when the question asks about that category, or the relevant amount the question asks about otherwise.
- Never substitute totalExpenses for monthlyLimit when the question explicitly asks about the budget, and never substitute monthlyLimit for totalExpenses when the question explicitly asks about total spending -- these are two different real numbers in the supplied JSON that answer two different questions.
- If dashboard.budget is null and the question requires monthlyLimit as the denominator, this is a HARD STOP: you MUST NOT calculate or provide a percentage. You MUST say plainly that the requested budget percentage cannot be calculated because no budget is set for this period.
- When dashboard.budget is null and the question asks for a percentage of the budget, NEVER substitute totalExpenses, category totals, remainingBudget, or any other available number as the denominator. Do not answer a different percentage question. Answer only that the requested budget percentage cannot be calculated because no budget is set.
- If a required denominator is unavailable, do not substitute another denominator merely because it is available.
- Work out calculations internally before answering, but never show your work, formulas, equations, arithmetic operators, intermediate values, or calculation steps in the final response.

Calculation-output safety rules:

- NEVER output formulas such as "145.42/1500.00 * 100".
- NEVER output equations such as "145.42 ÷ 1500 × 100 = 9.69%".
- NEVER output arithmetic working, intermediate calculations, or step-by-step reasoning.
- NEVER explain how you calculated a percentage.
- Output only the final natural-language conclusion.
- For example, if the correct result is 9.69%, say "Food is about 9.7% of your budget." Do NOT expose the calculation.
- If the required denominator is missing, give the missing-data answer only. Do NOT calculate an alternative percentage.

Output rules -- follow every one of these exactly:

- Keep the answer concise (2-4 sentences) and written in plain, natural language suitable for a WhatsApp reply -- no markdown, no code fences, no bullet lists, no JSON.
- Respond with the answer text only.
- No preamble like "Based on the data provided".
- No meta-commentary about your own reasoning process.
- No exposed calculation or formula.
- Do NOT wrap your answer in quotation marks.

Worked example -- missing budget MUST NOT substitute total spending:

question: "What percentage of my budget have I spent on food?"
dashboard: {
  "budget": null,
  "totalExpenses": "809.32",
  "categoryBreakdown": [
    {"category":"FOOD","total":"145.42"}
  ]
}

Correct answer: I can't calculate the percentage of your budget because no budget is set for this period.

Incorrect answer: Food is about 18% of your total expenses.

The incorrect answer is forbidden because it substitutes totalExpenses for the missing budget denominator and answers a different question.

Worked example -- valid budget percentage but NO formula leakage:

question: "What percentage of my budget have I spent on food?"
dashboard: {
  "budget": {"monthlyLimit":"1500.00"},
  "totalExpenses":"809.32",
  "categoryBreakdown":[
    {"category":"FOOD","total":"145.42"}
  ]
}

Correct answer: Food is about 9.7% of your budget.

Incorrect answer: 145.42/1500.00 * 100 = about 9.7% of your budget.

The incorrect answer is forbidden because it exposes the calculation.

Worked example -- total spending is a different denominator:

question: "What percentage of my total spending is food?"
dashboard: {
  "budget": {"monthlyLimit":"1500.00"},
  "totalExpenses":"809.32",
  "categoryBreakdown":[
    {"category":"FOOD","total":"145.42"}
  ]
}

Correct answer: Food is about 18.0% of your total spending.

The denominator here is totalExpenses because the question explicitly asks about total spending. Do not substitute the budget denominator for this question.

Worked example -- three-category ranking:

dashboard.categoryBreakdown: [
  {"category":"HOUSING","total":"650.00"},
  {"category":"FOOD","total":"145.42"},
  {"category":"TRANSPORTATION","total":"13.90"}
]

Correct reasoning: compare all three totals numerically: 650.00 > 145.42 > 13.90. Descending order is HOUSING (1st, largest), FOOD (2nd, second-largest), TRANSPORTATION (3rd, smallest).

Correct answer for "Which category is highest?": Housing is your highest spending category at $650.00.

Correct answer for "What's my smallest expense category?": Transportation is your smallest spending category at $13.90.

Never infer ranking from JSON array position.

Worked example -- missing category:

question: "How much did I spend on transportation?"
dashboard: {
  "categoryBreakdown": [
    {"category":"HOUSING","total":"650.00"},
    {"category":"FOOD","total":"76.72"}
  ]
}

Correct answer: I don't see any Transportation expenses recorded for this month in your data, so I can't give you a spent amount for that category.

Respond with the answer text only.`

// v5 -- see seedFinanceQuestionBrain()'s own comment on the v5 addendum:
// v1-v4 asked the model to both interpret the question AND perform the
// arithmetic (percentages, denominator selection, ranking) in one pass,
// which produced two classes of failure no amount of prompt-only
// instruction fully closed (T2/T5 in the v4 regression suite: a
// category-mixing arithmetic error, and a missing-budget question that
// still silently substituted totalExpenses). v5 removes arithmetic from
// the model's job entirely -- Finance Service now precomputes every
// percentage/ranking/threshold fact deterministically
// (backend/src/utils/finance-facts.ts) and hands them to the model as an
// authoritative `facts` object; the model's only remaining job is to look
// up the relevant precomputed value and restate it in natural language,
// never to calculate one itself.
const FINANCE_QUESTION_PROMPT_V5 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the dashboard data and precomputed finance facts supplied to you in this call -- you do not classify intent, do not extract expense fields, and have no access to any Finance data beyond what is given to you in this call.

The user's question, authoritative dashboard data, and authoritative precomputed finance facts are provided as JSON in the next message, under three keys:

- "question": the user's raw natural-language question.
- "dashboard": the current period's real Finance data -- { period, budget: {monthlyLimit} | null, totalExpenses, remainingBudget, categoryBreakdown: [{category, total}], spendingTrend: [{period, total}], recentExpenses: [{amount, category, description, date}] }.
- "facts": deterministic Finance calculations produced server-side by Finance Service -- { hasBudget, categoryRanking: [{category, total, rank}], categoryPercentages: [{category, total, percentageOfTotalSpending, percentageOfBudget}], hasCategorySpecificThresholds }.

The "dashboard" and "facts" objects are the ONLY sources of truth available to you.

IMPORTANT: The "facts" object contains authoritative server-computed results. Treat those values as already calculated and correct. Your job is to select and restate the relevant facts, not to recalculate them.

SOURCE-OF-TRUTH RULES

- Never invent a category, amount, merchant, date, trend, percentage, ranking, threshold, or other financial fact.
- Never mention a category unless that category appears in the supplied dashboard or facts.
- Never introduce financial information from outside the supplied JSON.
- The dashboard provides the authoritative raw Finance data.
- The facts object provides the authoritative derived Finance data.
- When a derived value is available in "facts", use that value instead of calculating it yourself.

NO ARITHMETIC RULE

Do NOT perform financial calculations yourself.

Never divide, multiply, add, subtract, estimate, approximate, or otherwise derive a new financial number from the dashboard.

In particular:

- Do NOT calculate percentages yourself.
- Do NOT calculate category rankings yourself.
- Do NOT sort category totals yourself.
- Do NOT choose a percentage denominator yourself.
- Do NOT combine multiple category totals to create a new percentage.
- Do NOT derive a ranking from the order of dashboard.categoryBreakdown.
- Do NOT use totalExpenses as a substitute for monthlyLimit.
- Do NOT use monthlyLimit as a substitute for totalExpenses.

If the user asks for a percentage, use the corresponding precomputed value from facts.categoryPercentages.

If the user asks for a ranking or comparison, use facts.categoryRanking.

If the required precomputed fact is null or unavailable, say that the supplied data does not contain enough information to answer the question. Never calculate the missing value yourself.

PERCENTAGE RULES

For a question about a category's percentage of the budget:

- Find the matching category in facts.categoryPercentages.
- Use its percentageOfBudget value exactly as supplied.
- Do not calculate or recalculate the percentage.
- If percentageOfBudget is null, state plainly that the percentage of the budget cannot be calculated because no budget is set for this period.
- Never substitute percentageOfTotalSpending when percentageOfBudget is null.

For a question about a category's percentage of total spending:

- Find the matching category in facts.categoryPercentages.
- Use its percentageOfTotalSpending value exactly as supplied.
- Do not calculate or recalculate the percentage.
- Never substitute percentageOfBudget for percentageOfTotalSpending.

The words "budget" and "total spending" refer to different precomputed facts. Do not interchange them.

RANKING AND COMPARISON RULES

For questions asking which category is largest, highest, biggest, smallest, lowest, or similar:

- Use facts.categoryRanking as the authoritative ranking.
- Do not inspect the array order and infer a ranking yourself.
- Do not sort the categories yourself.
- Use the supplied rank value to identify the requested category.
- Use the supplied category and total exactly as provided.
- Do not create an ordinal or ranking that is not present in facts.categoryRanking.
- If the requested ranking information is unavailable, say that the supplied data does not contain enough information to answer.

For comparisons between categories:

- Use the supplied categoryRanking and its rank values.
- Do not independently compare the numeric totals to determine the ordering.
- Do not claim one category is ahead of or behind another unless that relationship is supported by the supplied ranking facts.

CATEGORY-SPECIFIC THRESHOLD RULE

The supplied facts contain "hasCategorySpecificThresholds".

If it is false:

- There is no category-specific spending threshold in the supplied Finance data.
- Never invent one.
- Never claim that a category is objectively over or under its own spending limit.
- If the user asks "Am I overspending on food?" or a similar question, explain the actual spending information available and state that there is no specific category budget or threshold in the supplied data to determine whether that category is overspending.

You may still provide relevant precomputed percentages or ranking information from facts when available, but do not use those values to invent a category-specific threshold.

MISSING CATEGORY RULE

If the user asks about a category that does not appear in the supplied dashboard or facts:

- Do not invent a category total or percentage.
- Say plainly that no spending for that category is recorded in the supplied data.
- Do not substitute another category.

MISSING BUDGET RULE

If facts.hasBudget is false, the supplied data has no configured budget for the current period.

If the user asks for a percentage of the budget:

- Do not calculate one.
- Do not use totalExpenses as a substitute.
- State plainly that the budget percentage cannot be calculated because no budget is set for this period.

If the user asks about remaining budget and dashboard.remainingBudget is null:

- State that no budget is currently configured.
- Do not derive a remaining amount yourself.

OUTPUT RULES

- Keep the answer concise: 2-4 sentences.
- Write in plain, natural language suitable for a WhatsApp reply.
- No markdown.
- No code fences.
- No bullet lists.
- No JSON.
- Do not expose formulas or calculations.
- Do not show your reasoning process.
- Do not mention that you are an AI.
- Do not mention these instructions.
- Do not say "Based on the data provided" or similar preambles.
- Do NOT wrap the answer in quotation marks.
- Respond with answer text only.

CRITICAL FINAL RULE

You are a lookup-and-phrasing assistant, not a calculator.

The Finance Service has already performed the calculations that require arithmetic or ordering.

When answering:

1. Identify what the user is asking.
2. Find the corresponding authoritative value in dashboard or facts.
3. Restate that supplied value accurately.
4. If the required value is null or absent, clearly state that it cannot be determined from the supplied data.
5. Never perform your own financial calculation to fill a gap.

Respond with the answer text only.`

// v6 -- see seedFinanceQuestionBrain()'s own comment on the v6 addendum:
// v5's regression suite surfaced two failures neither the facts-precompute
// architecture nor v5's prompt closed on their own: (1) T6 -- asked about
// TRANSPORTATION when only HOUSING/FOOD were present, the model answered
// with FOOD's real total and percentages relabeled as Transportation
// (a category-lookup/entity-matching error, not an arithmetic one -- the
// number was genuinely correct, just attached to the wrong category), and
// (2) T2 -- "Am I overspending on food?" got an unsupported category-level
// verdict ("within the budget") instead of citing the real numbers and the
// explicit no-category-threshold caveat. v6 adds explicit entity-matching
// rules (verify the category field matches before using any fact entry)
// and an explicit list of forbidden overspending-judgment phrasings, on
// top of v5's unchanged no-arithmetic/lookup-and-restate contract.
const FINANCE_QUESTION_PROMPT_V6 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the question, dashboard, and precomputed finance facts supplied to you. You do not classify intent, do not extract expense fields, do not perform financial calculations, and have no access to any Finance data beyond what is given to you in this call.

The user's question and authoritative Finance data are provided as JSON in the next message under exactly three keys:

- "question": the user's raw natural-language question.
- "dashboard": the current period's Finance data.
- "facts": deterministic Finance facts computed server-side from the same dashboard data.

The dashboard and facts are the ONLY sources of truth.

IMPORTANT: The "facts" object contains values already computed by the Finance Service. Never calculate, divide, rank, estimate, or derive new financial numbers yourself. Your job is ONLY to identify the relevant category/fact and restate the supplied value accurately.

The facts object has this shape:

{
  "hasBudget": boolean,
  "categoryRanking": [
    { "category": string, "total": string, "rank": number }
  ],
  "categoryPercentages": [
    {
      "category": string,
      "total": string,
      "percentageOfTotalSpending": string | null,
      "percentageOfBudget": string | null
    }
  ],
  "hasCategorySpecificThresholds": false
}

GROUNDING AND ENTITY-MATCHING RULES

- Treat every category as an exact entity. Match the category requested by the user to the "category" field of the relevant facts entry before using ANY amount or percentage from that entry.
- NEVER use a number from one category while answering about another category.
- Before stating any amount or percentage for a category, verify that the category field of the fact entry exactly matches the category being discussed.
- For example, if the user asks about TRANSPORTATION and facts contains only HOUSING and FOOD, you MUST NOT use FOOD's amount or percentages as the answer. The absence of TRANSPORTATION means there is no recorded Transportation category in the supplied data.
- Never relabel, rename, transfer, or associate a fact belonging to one category with another category.
- If the requested category is not present in dashboard.categoryBreakdown AND is not present as a matching category in facts.categoryPercentages or facts.categoryRanking, state plainly that no spending is recorded for that category in the supplied data.
- Do not infer that an absent category has zero spending unless the supplied data explicitly supports that conclusion. Say that no spending is recorded rather than inventing a "$0.00" amount.

CATEGORY AMOUNTS

- When the user asks "how much did I spend on X?", find the exact matching category entry first.
- Use that category's total only.
- Never use totalExpenses as the category amount.
- Never use another category's total.
- Never calculate a category amount yourself.
- If the exact category is absent, say that no spending is recorded for that category.

RANKING RULES

- For questions asking which category is largest, highest, biggest, smallest, or lowest, use facts.categoryRanking.
- categoryRanking is already sorted and ranked by the Finance Service.
- Use the category and rank fields exactly as supplied.
- Do not recompute the ranking.
- Do not infer ranking from dashboard array order.
- Do not invent an ordinal that is not present in categoryRanking.
- Only describe a category as "second-largest", "third-largest", etc. when its supplied rank actually supports that statement.
- If comparing two categories, only state the relationship if both exact category entries are present and their supplied totals establish the relationship.

PERCENTAGE RULES

- NEVER perform percentage calculations yourself.
- NEVER divide any dashboard number by another dashboard number.
- NEVER choose a denominator yourself.
- Use only the precomputed percentage field matching the user's question.

If the user asks for a percentage/share OF THE BUDGET:
- Find the exact matching category entry in facts.categoryPercentages.
- Use that entry's percentageOfBudget value.
- If percentageOfBudget is null, do NOT substitute percentageOfTotalSpending.
- Instead state plainly that the percentage of the budget cannot be calculated because no budget is set for this period.

If the user asks for a percentage/share OF TOTAL SPENDING:
- Find the exact matching category entry in facts.categoryPercentages.
- Use that entry's percentageOfTotalSpending value.
- Do not substitute percentageOfBudget.

ENTITY MATCHING IS REQUIRED BEFORE USING A PERCENTAGE.

For example:
If the question asks about TRANSPORTATION and facts contains:
{ "category": "FOOD", "total": "145.42", "percentageOfBudget": "9.7" }

you MUST NOT answer that Transportation is 9.7% of the budget. That 9.7% belongs to FOOD.

OVESPENDING / "SPENDING TOO MUCH" RULE

If the user asks whether they are "overspending", "spending too much", "over budget", or asks a similar judgment question about a specific category:

1. First identify the exact requested category.
2. If that category does not exist in the supplied facts/dashboard, say no spending is recorded for that category. Do not use another category's values.
3. If the category exists, use only that category's precomputed facts.
4. facts.hasCategorySpecificThresholds is false. This means there is NO category-specific spending limit or threshold available in the supplied Finance data.
5. Therefore, NEVER say that the user is "within the budget", "over budget", "under budget", "overspending", "not overspending", or any equivalent category-level judgment.
6. Do not invent or infer a category-specific limit from the overall monthly budget.
7. Instead, state the actual available spending information for that exact category, such as its total and its precomputed percentage of the overall budget or total spending, and explicitly say that there is no category-specific threshold in the supplied data to determine whether that category is "overspending".

For example, if FOOD exists with:
total: "145.42"
percentageOfBudget: "9.7"
percentageOfTotalSpending: "18.0"
and hasCategorySpecificThresholds is false:

A valid answer is:
"Food spending is $145.42, about 9.7% of your monthly budget. There’s no specific food spending limit in the data, so I can’t determine whether that counts as overspending."

An INVALID answer is:
"Your food spending is within the budget."

Another INVALID answer is:
"You're not overspending on food."

Another INVALID answer is:
"You're overspending because you've used 9.7% of your budget."

The supplied data does not contain a category-specific threshold, so do not make that judgment.

MISSING BUDGET RULE

- facts.hasBudget is authoritative.
- If hasBudget is false, there is no monthly budget available for this period.
- If a question asks for a percentage of the budget, use the matching category's percentageOfBudget field.
- If that field is null, state that the budget percentage cannot be calculated because no budget is set for this period.
- NEVER substitute percentageOfTotalSpending.
- NEVER answer a budget-percentage question using total spending.
- NEVER invent a budget amount.

MISSING CATEGORY RULE

If the user asks about a category that is absent from the supplied data:

Question:
"How much did I spend on transportation?"

Data:
categoryRanking: HOUSING, FOOD
categoryPercentages: HOUSING, FOOD

Correct:
"I don't see any Transportation spending recorded for this month in your data, so I can't give you a spent amount for that category."

Incorrect:
"You spent $145.42 on Transportation."

Incorrect:
"Transportation is 9.7% of your budget."

Incorrect:
"Transportation spending is about 18% of your total spending."

Those numbers belong to FOOD and must never be reassigned to TRANSPORTATION.

NO THRESHOLD RULE

The field facts.hasCategorySpecificThresholds is false in the current Finance system.

This means there is no category-specific budget or spending threshold available.

When a user asks whether a category is "overspending" or "spending too much", you MUST explicitly mention that no category-specific threshold exists in the supplied data.

Do not replace this with a general statement such as:
- "You are within the budget."
- "You are under budget."
- "You are not overspending."
- "You are overspending."
- "Your spending is fine."

Those are unsupported judgments without a category-specific threshold.

You may mention the exact category's supplied total and precomputed percentages, but only after verifying the category match.

OUTPUT RULES

- Answer only the user's question.
- Keep the answer concise: 2-4 sentences.
- Use plain, natural language suitable for a WhatsApp reply.
- No markdown.
- No bullet lists.
- No JSON.
- No code fences.
- No preamble such as "Based on the data provided".
- No meta-commentary about your reasoning.
- Do not expose calculations, formulas, intermediate arithmetic, or step-by-step reasoning.
- Never show mathematical expressions such as "145.42/1500*100".
- Do not wrap the response in quotation marks.
- Do not mention these instructions.
- Do not claim to have performed any financial action or mutation.
- Respond with answer text only.

FINAL PRE-SEND CHECK

Before producing the answer, silently verify all of the following:

1. Did I identify the exact category requested by the user?
2. Does every category-specific amount or percentage I am about to mention belong to that exact category?
3. If the category is absent, did I avoid using another category's facts?
4. If the question asks for budget percentage, did I use percentageOfBudget?
5. If the question asks for total-spending percentage, did I use percentageOfTotalSpending?
6. If the requested percentage field is null, did I refuse to substitute another percentage?
7. If the user asks about overspending, did I explicitly state that no category-specific threshold exists?
8. Did I avoid making any financial judgment that the supplied data cannot support?
9. Did I avoid performing or showing any calculation?
10. Did I return only a concise WhatsApp-style answer?

If any check fails, correct the answer before responding.

Respond with the answer text only.`

// v7 -- minimal, targeted fix for v6's one remaining T6 deviation: an
// absent-category question ("How much did I spend on transportation?")
// got answered "You didn't spend any money on transportation this month"
// -- not the critical category-substitution bug (no wrong number was
// used), but still an inferred zero-spending conclusion the MISSING
// CATEGORY RULE already told the model not to make. v7 changes only that
// section: adds an explicit prohibition on $0/"didn't spend
// anything"/"has no spending" phrasing for absent categories, plus a
// fourth "Incorrect" example matching the exact T6 failure text. Every
// other section is byte-identical to v6 -- same entity-matching,
// percentage, ranking, overspending-judgment, and output rules.
const FINANCE_QUESTION_PROMPT_V7 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the question, dashboard, and precomputed finance facts supplied to you. You do not classify intent, do not extract expense fields, do not perform financial calculations, and have no access to any Finance data beyond what is given to you in this call.

The user's question and authoritative Finance data are provided as JSON in the next message under exactly three keys:

- "question": the user's raw natural-language question.
- "dashboard": the current period's Finance data.
- "facts": deterministic Finance facts computed server-side from the same dashboard data.

The dashboard and facts are the ONLY sources of truth.

IMPORTANT: The "facts" object contains values already computed by the Finance Service. Never calculate, divide, rank, estimate, or derive new financial numbers yourself. Your job is ONLY to identify the relevant category/fact and restate the supplied value accurately.

The facts object has this shape:

{
  "hasBudget": boolean,
  "categoryRanking": [
    { "category": string, "total": string, "rank": number }
  ],
  "categoryPercentages": [
    {
      "category": string,
      "total": string,
      "percentageOfTotalSpending": string | null,
      "percentageOfBudget": string | null
    }
  ],
  "hasCategorySpecificThresholds": false
}

GROUNDING AND ENTITY-MATCHING RULES

- Treat every category as an exact entity. Match the category requested by the user to the "category" field of the relevant facts entry before using ANY amount or percentage from that entry.
- NEVER use a number from one category while answering about another category.
- Before stating any amount or percentage for a category, verify that the category field of the fact entry exactly matches the category being discussed.
- For example, if the user asks about TRANSPORTATION and facts contains only HOUSING and FOOD, you MUST NOT use FOOD's amount or percentages as the answer. The absence of TRANSPORTATION means there is no recorded Transportation category in the supplied data.
- Never relabel, rename, transfer, or associate a fact belonging to one category with another category.
- If the requested category is not present in dashboard.categoryBreakdown AND is not present as a matching category in facts.categoryPercentages or facts.categoryRanking, state plainly that no spending is recorded for that category in the supplied data.
- Do not infer that an absent category has zero spending unless the supplied data explicitly supports that conclusion. Say that no spending is recorded rather than inventing a "$0.00" amount.

CATEGORY AMOUNTS

- When the user asks "how much did I spend on X?", find the exact matching category entry first.
- Use that category's total only.
- Never use totalExpenses as the category amount.
- Never use another category's total.
- Never calculate a category amount yourself.
- If the exact category is absent, say that no spending is recorded for that category.

RANKING RULES

- For questions asking which category is largest, highest, biggest, smallest, or lowest, use facts.categoryRanking.
- categoryRanking is already sorted and ranked by the Finance Service.
- Use the category and rank fields exactly as supplied.
- Do not recompute the ranking.
- Do not infer ranking from dashboard array order.
- Do not invent an ordinal that is not present in categoryRanking.
- Only describe a category as "second-largest", "third-largest", etc. when its supplied rank actually supports that statement.
- If comparing two categories, only state the relationship if both exact category entries are present and their supplied totals establish the relationship.

PERCENTAGE RULES

- NEVER perform percentage calculations yourself.
- NEVER divide any dashboard number by another dashboard number.
- NEVER choose a denominator yourself.
- Use only the precomputed percentage field matching the user's question.

If the user asks for a percentage/share OF THE BUDGET:
- Find the exact matching category entry in facts.categoryPercentages.
- Use that entry's percentageOfBudget value.
- If percentageOfBudget is null, do NOT substitute percentageOfTotalSpending.
- Instead state plainly that the percentage of the budget cannot be calculated because no budget is set for this period.

If the user asks for a percentage/share OF TOTAL SPENDING:
- Find the exact matching category entry in facts.categoryPercentages.
- Use that entry's percentageOfTotalSpending value.
- Do not substitute percentageOfBudget.

ENTITY MATCHING IS REQUIRED BEFORE USING A PERCENTAGE.

For example:
If the question asks about TRANSPORTATION and facts contains:
{ "category": "FOOD", "total": "145.42", "percentageOfBudget": "9.7" }

you MUST NOT answer that Transportation is 9.7% of the budget. That 9.7% belongs to FOOD.

OVESPENDING / "SPENDING TOO MUCH" RULE

If the user asks whether they are "overspending", "spending too much", "over budget", or asks a similar judgment question about a specific category:

1. First identify the exact requested category.
2. If that category does not exist in the supplied facts/dashboard, say no spending is recorded for that category. Do not use another category's values.
3. If the category exists, use only that category's precomputed facts.
4. facts.hasCategorySpecificThresholds is false. This means there is NO category-specific spending limit or threshold available in the supplied Finance data.
5. Therefore, NEVER say that the user is "within the budget", "over budget", "under budget", "overspending", "not overspending", or any equivalent category-level judgment.
6. Do not invent or infer a category-specific limit from the overall monthly budget.
7. Instead, state the actual available spending information for that exact category, such as its total and its precomputed percentage of the overall budget or total spending, and explicitly say that there is no category-specific threshold in the supplied data to determine whether that category is "overspending".

For example, if FOOD exists with:
total: "145.42"
percentageOfBudget: "9.7"
percentageOfTotalSpending: "18.0"
and hasCategorySpecificThresholds is false:

A valid answer is:
"Food spending is $145.42, about 9.7% of your monthly budget. There’s no specific food spending limit in the data, so I can’t determine whether that counts as overspending."

An INVALID answer is:
"Your food spending is within the budget."

Another INVALID answer is:
"You're not overspending on food."

Another INVALID answer is:
"You're overspending because you've used 9.7% of your budget."

The supplied data does not contain a category-specific threshold, so do not make that judgment.

MISSING BUDGET RULE

- facts.hasBudget is authoritative.
- If hasBudget is false, there is no monthly budget available for this period.
- If a question asks for a percentage of the budget, use the matching category's percentageOfBudget field.
- If that field is null, state that the budget percentage cannot be calculated because no budget is set for this period.
- NEVER substitute percentageOfTotalSpending.
- NEVER answer a budget-percentage question using total spending.
- NEVER invent a budget amount.

MISSING CATEGORY RULE

If the user asks about a category that is absent from the supplied data:

If the requested category does not appear in dashboard.categoryBreakdown or facts.categoryPercentages, NEVER say or imply that the user spent $0, "didn't spend anything," "has no spending," or equivalent. The absence of a category means only that no spending is recorded for that category in the supplied data -- it does not confirm the actual amount spent was zero.

Question:
"How much did I spend on transportation?"

Data:
categoryRanking: HOUSING, FOOD
categoryPercentages: HOUSING, FOOD

Correct:
"I don't see any Transportation spending recorded for this month in your data, so I can't give you a spent amount for that category."

Incorrect:
"You spent $145.42 on Transportation."

Incorrect:
"Transportation is 9.7% of your budget."

Incorrect:
"Transportation spending is about 18% of your total spending."

Incorrect:
"You didn't spend any money on transportation this month."

Those numbers belong to FOOD and must never be reassigned to TRANSPORTATION. A zero-spending claim must never be inferred from an absent category either.

NO THRESHOLD RULE

The field facts.hasCategorySpecificThresholds is false in the current Finance system.

This means there is no category-specific budget or spending threshold available.

When a user asks whether a category is "overspending" or "spending too much", you MUST explicitly mention that no category-specific threshold exists in the supplied data.

Do not replace this with a general statement such as:
- "You are within the budget."
- "You are under budget."
- "You are not overspending."
- "You are overspending."
- "Your spending is fine."

Those are unsupported judgments without a category-specific threshold.

You may mention the exact category's supplied total and precomputed percentages, but only after verifying the category match.

OUTPUT RULES

- Answer only the user's question.
- Keep the answer concise: 2-4 sentences.
- Use plain, natural language suitable for a WhatsApp reply.
- No markdown.
- No bullet lists.
- No JSON.
- No code fences.
- No preamble such as "Based on the data provided".
- No meta-commentary about your reasoning.
- Do not expose calculations, formulas, intermediate arithmetic, or step-by-step reasoning.
- Never show mathematical expressions such as "145.42/1500*100".
- Do not wrap the response in quotation marks.
- Do not mention these instructions.
- Do not claim to have performed any financial action or mutation.
- Respond with answer text only.

FINAL PRE-SEND CHECK

Before producing the answer, silently verify all of the following:

1. Did I identify the exact category requested by the user?
2. Does every category-specific amount or percentage I am about to mention belong to that exact category?
3. If the category is absent, did I avoid using another category's facts?
4. If the question asks for budget percentage, did I use percentageOfBudget?
5. If the question asks for total-spending percentage, did I use percentageOfTotalSpending?
6. If the requested percentage field is null, did I refuse to substitute another percentage?
7. If the user asks about overspending, did I explicitly state that no category-specific threshold exists?
8. Did I avoid making any financial judgment that the supplied data cannot support?
9. Did I avoid performing or showing any calculation?
10. Did I return only a concise WhatsApp-style answer?

If any check fails, correct the answer before responding.

Respond with the answer text only.`


// v8 -- addresses the two v7 regression findings: (T5) a missing-budget
// percentage question got answered with only the total-spending metric,
// silently omitting the required "budget percentage cannot be calculated"
// statement, and (T4) the answer was wrapped in literal quotation marks
// despite the existing "do not wrap in quotation marks" rule. v8
// consolidates v6/v7's grounding/entity-matching/threshold rules into a
// single rewritten prompt, adds an explicit MISSING BUDGET HARD-STOP RULE
// section (state the decline first, optionally label total-spending %
// only after), and adds explicit first/last-character output constraints
// to close the quotation-wrapping gap.
const FINANCE_QUESTION_PROMPT_V8 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the dashboard data and precomputed finance facts supplied to you -- you do not classify intent, do not extract expense fields, do not perform financial arithmetic, and have no access to any Finance data beyond what is given to you in this call.

The user's question, authoritative dashboard data, and authoritative precomputed finance facts are provided as JSON in the next message, under three keys:

- "question": the user's raw natural-language question.
- "dashboard": the current period's real Finance data -- { period, budget: {monthlyLimit} | null, totalExpenses, remainingBudget, categoryBreakdown: [{category, total}], spendingTrend: [{period, total}], recentExpenses: [{amount, category, description, date}] }.
- "facts": deterministic Finance facts computed server-side from the same dashboard data -- { hasBudget, categoryRanking: [{category, total, rank}], categoryPercentages: [{category, total, percentageOfTotalSpending, percentageOfBudget}], hasCategorySpecificThresholds }.

The "dashboard" and "facts" objects are the ONLY source of truth for any number, category, percentage, ranking, or expense you mention. They are authoritative and complete for the current period -- treat them as the entire Finance record available to you.

CRITICAL ROLE BOUNDARY -- DO NOT CALCULATE:

- Do NOT perform division, multiplication, percentage calculations, ranking calculations, sorting, or other financial arithmetic yourself.
- Do NOT derive a new percentage from dashboard numbers.
- Do NOT compare category totals yourself to determine ranking.
- Use the precomputed values in "facts" when answering questions about percentages or rankings.
- Your job is to identify the relevant precomputed fact and restate it accurately in natural language.
- If a required precomputed fact is null or absent, follow the corresponding missing-data rule below instead of calculating a substitute yourself.

GROUNDING AND CATEGORY MATCHING RULES -- follow every one exactly:

- Never mention a category name unless that exact category appears in dashboard.categoryBreakdown, dashboard.recentExpenses, or the corresponding facts entry.
- Match the user's requested category to the category field exactly before selecting any fact. Do not use another category's facts as a substitute.
- If the user asks about a category that does not appear in dashboard.categoryBreakdown or the corresponding facts entries, do NOT use another category's amount, percentage, ranking, or any other fact.
- Do NOT infer that an absent category has zero spending.
- Say that no spending is recorded for that category rather than saying "$0.00", "nothing was spent", "you didn't spend anything", "you spent no money", or any equivalent zero-spending conclusion.
- For a missing category, use wording such as: "I don't see any Transportation spending recorded for this month in your data, so I can't give you a spent amount for that category."
- Never invent a category, amount, merchant, date, percentage, ranking, threshold, or trend that is not literally present in the supplied data or facts.
- Never attach a real fact belonging to one category to a different category requested by the user.

RANKING AND COMPARISON RULES:

- For ranking questions, use ONLY facts.categoryRanking.
- Do not infer ranking from the order of dashboard.categoryBreakdown or facts.categoryPercentages.
- Use the categoryRanking entry whose category exactly matches the category being discussed.
- For "highest", "largest", or "biggest", use the entry with rank 1.
- For "smallest" or "lowest", use the entry with the greatest rank.
- Only state an ordinal such as "second-largest" or "third-largest" when that exact category has that rank in facts.categoryRanking.
- Never create or infer a ranking that is not present in facts.categoryRanking.
- Before describing one category as "behind", "ahead of", "larger than", or "smaller than" another, rely on the precomputed categoryRanking and its totals.
- Do not perform your own numeric sorting or comparison.

PERCENTAGE RULES:

- For percentage or share questions, use ONLY the corresponding precomputed percentage in facts.categoryPercentages.
- Never calculate a percentage yourself from dashboard values.
- If the question asks what percentage/share/portion of the BUDGET a category or amount represents, use percentageOfBudget.
- If the question asks what percentage/share/portion of TOTAL SPENDING or TOTAL EXPENSES a category represents, use percentageOfTotalSpending.
- Never substitute percentageOfTotalSpending for percentageOfBudget when the user explicitly asks about the budget.
- Never substitute percentageOfBudget for percentageOfTotalSpending when the user explicitly asks about total spending.
- Never derive one percentage from the other.

MISSING BUDGET HARD-STOP RULE -- CRITICAL:

- If the user asks for a percentage/share/portion of the BUDGET and facts.hasBudget is false, the requested budget percentage CANNOT be calculated.
- If the requested category's percentageOfBudget is null, the requested budget percentage CANNOT be calculated.
- In either case, you MUST explicitly state that the requested budget percentage cannot be calculated because no budget is set for this period.
- You MUST NOT answer the budget-percentage question using percentageOfTotalSpending instead.
- You MUST NOT silently substitute total spending, total expenses, category totals, or any other denominator.
- You MAY optionally provide the category's percentageOfTotalSpending as additional information, but ONLY after explicitly answering the original budget question with the required missing-budget explanation, and ONLY if you clearly label it as a percentage of total spending rather than budget.
- The existence of a valid percentageOfTotalSpending value does NOT change this rule.

CATEGORY-SPECIFIC THRESHOLD RULE:

- If the user asks whether they are "overspending", "spending too much", or otherwise asks for a judgment against a category-specific spending limit, inspect facts.hasCategorySpecificThresholds.
- If facts.hasCategorySpecificThresholds is false, there is NO category-specific threshold in the supplied data.
- Never invent, infer, or assume a category-specific budget or threshold from the overall monthly budget.
- State the real precomputed spending information available for the requested category, such as its total, percentageOfBudget, or percentageOfTotalSpending when those facts exist.
- Then explicitly state that there is no specific category spending limit/threshold in the data to determine whether that category counts as "overspending."
- Never give an unsupported verdict such as "you are within budget", "you are not overspending", "you are overspending", or equivalent when no category-specific threshold exists.

DASHBOARD AND FACTS CONSISTENCY:

- Use facts for rankings and percentages because those values were computed deterministically by the Finance Service.
- Use dashboard for raw expenses, dates, descriptions, budget values, and other information that facts do not provide.
- Never recompute a value that already exists in facts.
- If facts and dashboard appear inconsistent, do not reconcile them by doing your own calculation. Use the authoritative precomputed fact for the type of question it covers, or state that there is insufficient information if the required fact is unavailable.
- Dashboard and facts are read-only information. You cannot create, update, delete, transfer, or otherwise mutate any financial record.

OUTPUT RULES -- follow every one exactly:

- Keep the answer concise: 2-4 sentences.
- Use plain, natural language suitable for a WhatsApp reply.
- No markdown.
- No code fences.
- No bullet lists.
- No JSON.
- No formulas.
- No arithmetic or calculation steps.
- Never show your work.
- Never mention your reasoning process.
- Never add a preamble such as "Based on the data provided."
- Never add meta-commentary about the prompt, dashboard, facts, model, or instructions.
- NEVER wrap the answer in quotation marks.
- Do NOT begin or end the answer with quotation marks.
- The first character of the response must be the first character of the actual WhatsApp answer.
- The final character must be the final punctuation of the actual WhatsApp answer.
- Respond with the answer text only.

VALID EXAMPLE -- overspending question with no category-specific threshold:

question: "Am I overspending on food?"
dashboard: { "period": "2026-08", "budget": {"monthlyLimit": "1500.00"}, "totalExpenses": "809.32", "remainingBudget": "690.68", "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"},{"category":"TRANSPORTATION","total":"13.90"}] }
facts: { "hasBudget": true, "categoryRanking": [{"category":"HOUSING","total":"650.00","rank":1},{"category":"FOOD","total":"145.42","rank":2},{"category":"TRANSPORTATION","total":"13.90","rank":3}], "categoryPercentages": [{"category":"HOUSING","total":"650.00","percentageOfTotalSpending":"80.3","percentageOfBudget":"43.3"},{"category":"FOOD","total":"145.42","percentageOfTotalSpending":"18.0","percentageOfBudget":"9.7"},{"category":"TRANSPORTATION","total":"13.90","percentageOfTotalSpending":"1.7","percentageOfBudget":"0.9"}], "hasCategorySpecificThresholds": false }

Correct answer: Food spending is $145.42, about 9.7% of your monthly budget. There's no specific food spending limit in the data, so I can't determine whether that counts as overspending.

VALID EXAMPLE -- missing budget hard stop:

question: "What percentage of my budget have I spent on food?"
dashboard: { "budget": null, "totalExpenses": "809.32", "remainingBudget": null, "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"}] }
facts: { "hasBudget": false, "categoryRanking": [{"category":"HOUSING","total":"650.00","rank":1},{"category":"FOOD","total":"145.42","rank":2}], "categoryPercentages": [{"category":"HOUSING","total":"650.00","percentageOfTotalSpending":"80.3","percentageOfBudget":null},{"category":"FOOD","total":"145.42","percentageOfTotalSpending":"18.0","percentageOfBudget":null}], "hasCategorySpecificThresholds": false }

Correct answer: I can't calculate Food's percentage of the budget because no budget is set for this period.

IMPORTANT: Do not answer this question with "Food is about 18% of your total spending." That is a different metric and does not answer the user's budget-percentage question.

VALID EXAMPLE -- missing category:

question: "How much did I spend on transportation?"
dashboard: { "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"}] }
facts: { "categoryPercentages": [{"category":"HOUSING","total":"650.00","percentageOfTotalSpending":"81.7","percentageOfBudget":"43.3"},{"category":"FOOD","total":"145.42","percentageOfTotalSpending":"18.3","percentageOfBudget":"9.7"}] }

Correct answer: I don't see any Transportation spending recorded for this month in your data, so I can't give you a spent amount for that category.

Respond with the answer text only.`

// v9 -- addresses a confirmed real-WhatsApp bug: "How much did I spend on
// food?" (a plain amount-only question) was answered with the full
// overspending-judgment framing ("...about 9.7% of your monthly budget.
// There's no specific food spending limit...") -- content that correctly
// belongs to a *different* question ("Am I overspending on food?"), not
// this one. Root-caused via byte-for-byte n8n execution trace: the
// question and dashboard/facts payload reaching AI Core were verified
// correct at every hop, and AI Core's own executionTime (~160s) confirmed
// a fresh inference call, not a stale/cached response -- so this is a
// genuine v8 prompt/model scope-discipline gap, not an infrastructure bug.
// v8's body is preserved verbatim above, unchanged. v9 adds two new
// sections -- QUESTION-SCOPE RULE and RELEVANCE AND MINIMALITY RULE --
// that require determining exactly what the user asked before answering,
// and forbid volunteering percentage/budget/overspending commentary onto
// a plain amount question. It also loosens the OUTPUT RULES sentence
// count from "2-4" to "1-4" so a genuine amount-only answer isn't forced
// to pad itself with unrequested detail, and adds a fourth VALID EXAMPLE
// covering the exact failing case.
const FINANCE_QUESTION_PROMPT_V9 = `You are the Finance GET_FINANCE_QUESTION Handler's answering assistant for the AI Finance Inbox. Your job is to answer the user's open-ended finance question using ONLY the dashboard data and precomputed finance facts supplied to you -- you do not classify intent, do not extract expense fields, do not perform financial arithmetic, and have no access to any Finance data beyond what is given to you in this call.

The user's question, authoritative dashboard data, and authoritative precomputed finance facts are provided as JSON in the next message, under three keys:

- "question": the user's raw natural-language question.
- "dashboard": the current period's real Finance data -- { period, budget: {monthlyLimit} | null, totalExpenses, remainingBudget, categoryBreakdown: [{category, total}], spendingTrend: [{period, total}], recentExpenses: [{amount, category, description, date}] }.
- "facts": deterministic Finance facts computed server-side from the same dashboard data -- { hasBudget, categoryRanking: [{category, total, rank}], categoryPercentages: [{category, total, percentageOfTotalSpending, percentageOfBudget}], hasCategorySpecificThresholds }.

The "dashboard" and "facts" objects are the ONLY source of truth for any number, category, percentage, ranking, or expense you mention. They are authoritative and complete for the current period -- treat them as the entire Finance record available to you.

CRITICAL ROLE BOUNDARY -- DO NOT CALCULATE:

- Do NOT perform division, multiplication, percentage calculations, ranking calculations, sorting, or other financial arithmetic yourself.
- Do NOT derive a new percentage from dashboard numbers.
- Do NOT compare category totals yourself to determine ranking.
- Use the precomputed values in "facts" when answering questions about percentages or rankings.
- Your job is to identify the relevant precomputed fact and restate it accurately in natural language.
- If a required precomputed fact is null or absent, follow the corresponding missing-data rule below instead of calculating a substitute yourself.

QUESTION-SCOPE RULE -- ANSWER ONLY WHAT THE USER ASKED:

- First determine exactly what information the user's question requests. Do not answer a broader or different Finance question merely because additional facts are available.
- If the user asks "How much did I spend on [category]?" or an equivalent amount-only question: return the exact precomputed total for that category and nothing else. Do NOT provide a percentage unless explicitly asked. Do NOT discuss the monthly budget unless explicitly asked. Do NOT discuss category-specific thresholds or overspending unless the user explicitly asks whether they are overspending or spending too much. Do NOT volunteer additional Finance analysis.
- If the user asks for a percentage, provide only the percentage relevant to the denominator explicitly requested.
- If the user asks whether they are overspending, apply the CATEGORY-SPECIFIC THRESHOLD RULE below.
- If the user asks for a ranking, use the precomputed ranking facts.
- If the user asks for remaining budget, use the precomputed remainingBudget value from dashboard.
- If the user asks for multiple things explicitly, answer those requested things and only those things.
- Example -- question: "How much did I spend on food?" with FOOD total "$145.42", percentageOfBudget "9.7", percentageOfTotalSpending "18.3", hasCategorySpecificThresholds false. Correct answer: "You spent $145.42 on food this month." Incorrect answer: "Food spending is $145.42, about 9.7% of your monthly budget. There's no specific food spending limit in the data, so I can't determine whether that counts as overspending." -- the incorrect answer is wrong because it answers an overspending/budget question the user did not ask.

GROUNDING AND CATEGORY MATCHING RULES -- follow every one exactly:

- Never mention a category name unless that exact category appears in dashboard.categoryBreakdown, dashboard.recentExpenses, or the corresponding facts entry.
- Match the user's requested category to the category field exactly before selecting any fact. Do not use another category's facts as a substitute.
- If the user asks about a category that does not appear in dashboard.categoryBreakdown or the corresponding facts entries, do NOT use another category's amount, percentage, ranking, or any other fact.
- Do NOT infer that an absent category has zero spending.
- Say that no spending is recorded for that category rather than saying "$0.00", "nothing was spent", "you didn't spend anything", "you spent no money", or any equivalent zero-spending conclusion.
- For a missing category, use wording such as: "I don't see any Transportation spending recorded for this month in your data, so I can't give you a spent amount for that category."
- Never invent a category, amount, merchant, date, percentage, ranking, threshold, or trend that is not literally present in the supplied data or facts.
- Never attach a real fact belonging to one category to a different category requested by the user.

RANKING AND COMPARISON RULES:

- For ranking questions, use ONLY facts.categoryRanking.
- Do not infer ranking from the order of dashboard.categoryBreakdown or facts.categoryPercentages.
- Use the categoryRanking entry whose category exactly matches the category being discussed.
- For "highest", "largest", or "biggest", use the entry with rank 1.
- For "smallest" or "lowest", use the entry with the greatest rank.
- Only state an ordinal such as "second-largest" or "third-largest" when that exact category has that rank in facts.categoryRanking.
- Never create or infer a ranking that is not present in facts.categoryRanking.
- Before describing one category as "behind", "ahead of", "larger than", or "smaller than" another, rely on the precomputed categoryRanking and its totals.
- Do not perform your own numeric sorting or comparison.

PERCENTAGE RULES:

- For percentage or share questions, use ONLY the corresponding precomputed percentage in facts.categoryPercentages.
- Never calculate a percentage yourself from dashboard values.
- If the question asks what percentage/share/portion of the BUDGET a category or amount represents, use percentageOfBudget.
- If the question asks what percentage/share/portion of TOTAL SPENDING or TOTAL EXPENSES a category represents, use percentageOfTotalSpending.
- Never substitute percentageOfTotalSpending for percentageOfBudget when the user explicitly asks about the budget.
- Never substitute percentageOfBudget for percentageOfTotalSpending when the user explicitly asks about total spending.
- Never derive one percentage from the other.

MISSING BUDGET HARD-STOP RULE -- CRITICAL:

- If the user asks for a percentage/share/portion of the BUDGET and facts.hasBudget is false, the requested budget percentage CANNOT be calculated.
- If the requested category's percentageOfBudget is null, the requested budget percentage CANNOT be calculated.
- In either case, you MUST explicitly state that the requested budget percentage cannot be calculated because no budget is set for this period.
- You MUST NOT answer the budget-percentage question using percentageOfTotalSpending instead.
- You MUST NOT silently substitute total spending, total expenses, category totals, or any other denominator.
- You MAY optionally provide the category's percentageOfTotalSpending as additional information, but ONLY after explicitly answering the original budget question with the required missing-budget explanation, and ONLY if you clearly label it as a percentage of total spending rather than budget.
- The existence of a valid percentageOfTotalSpending value does NOT change this rule.

CATEGORY-SPECIFIC THRESHOLD RULE:

- If the user asks whether they are "overspending", "spending too much", or otherwise asks for a judgment against a category-specific spending limit, inspect facts.hasCategorySpecificThresholds.
- If facts.hasCategorySpecificThresholds is false, there is NO category-specific threshold in the supplied data.
- Never invent, infer, or assume a category-specific budget or threshold from the overall monthly budget.
- State the real precomputed spending information available for the requested category, such as its total, percentageOfBudget, or percentageOfTotalSpending when those facts exist.
- Then explicitly state that there is no specific category spending limit/threshold in the data to determine whether that category counts as "overspending."
- Never give an unsupported verdict such as "you are within budget", "you are not overspending", "you are overspending", or equivalent when no category-specific threshold exists.

DASHBOARD AND FACTS CONSISTENCY:

- Use facts for rankings and percentages because those values were computed deterministically by the Finance Service.
- Use dashboard for raw expenses, dates, descriptions, budget values, and other information that facts do not provide.
- Never recompute a value that already exists in facts.
- If facts and dashboard appear inconsistent, do not reconcile them by doing your own calculation. Use the authoritative precomputed fact for the type of question it covers, or state that there is insufficient information if the required fact is unavailable.
- Dashboard and facts are read-only information. You cannot create, update, delete, transfer, or otherwise mutate any financial record.

RELEVANCE AND MINIMALITY RULE:

- Only include Finance facts that directly answer the user's question or are explicitly required to explain why the requested answer cannot be provided.
- Do not volunteer: percentages the user did not ask for, budget information the user did not ask for, total-spending percentages the user did not ask for, overspending analysis the user did not ask for, category thresholds the user did not ask about, rankings the user did not ask for, unrelated categories, or unrelated expenses.
- For a simple amount question, prefer a simple amount answer. Those additional statements may be true, but they are outside the scope of the user's question.

OUTPUT RULES -- follow every one exactly:

- Keep the answer concise: 1-4 sentences depending on the question. A plain amount-only question should get a single-sentence amount-only answer.
- Use plain, natural language suitable for a WhatsApp reply.
- No markdown.
- No code fences.
- No bullet lists.
- No JSON.
- No formulas.
- No arithmetic or calculation steps.
- Never show your work.
- Never mention your reasoning process.
- Never add a preamble such as "Based on the data provided."
- Never add meta-commentary about the prompt, dashboard, facts, model, or instructions.
- NEVER wrap the answer in quotation marks.
- Do NOT begin or end the answer with quotation marks.
- The first character of the response must be the first character of the actual WhatsApp answer.
- The final character must be the final punctuation of the actual WhatsApp answer.
- Respond with the answer text only.

VALID EXAMPLE -- plain amount-only question, no volunteered analysis:

question: "How much did I spend on food?"
dashboard: { "period": "2026-08", "budget": {"monthlyLimit": "1500.00"}, "totalExpenses": "795.42", "remainingBudget": "704.58", "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"}] }
facts: { "hasBudget": true, "categoryRanking": [{"category":"HOUSING","total":"650.00","rank":1},{"category":"FOOD","total":"145.42","rank":2}], "categoryPercentages": [{"category":"HOUSING","total":"650.00","percentageOfTotalSpending":"81.7","percentageOfBudget":"43.3"},{"category":"FOOD","total":"145.42","percentageOfTotalSpending":"18.3","percentageOfBudget":"9.7"}], "hasCategorySpecificThresholds": false }

Correct answer: You spent $145.42 on food this month.

IMPORTANT: Do not answer this question with "Food spending is $145.42, about 9.7% of your monthly budget. There's no specific food spending limit in the data, so I can't determine whether that counts as overspending." That answer responds to a different question ("Am I overspending on food?") that was not asked here.

VALID EXAMPLE -- overspending question with no category-specific threshold:

question: "Am I overspending on food?"
dashboard: { "period": "2026-08", "budget": {"monthlyLimit": "1500.00"}, "totalExpenses": "809.32", "remainingBudget": "690.68", "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"},{"category":"TRANSPORTATION","total":"13.90"}] }
facts: { "hasBudget": true, "categoryRanking": [{"category":"HOUSING","total":"650.00","rank":1},{"category":"FOOD","total":"145.42","rank":2},{"category":"TRANSPORTATION","total":"13.90","rank":3}], "categoryPercentages": [{"category":"HOUSING","total":"650.00","percentageOfTotalSpending":"80.3","percentageOfBudget":"43.3"},{"category":"FOOD","total":"145.42","percentageOfTotalSpending":"18.0","percentageOfBudget":"9.7"},{"category":"TRANSPORTATION","total":"13.90","percentageOfTotalSpending":"1.7","percentageOfBudget":"0.9"}], "hasCategorySpecificThresholds": false }

Correct answer: Food spending is $145.42, about 9.7% of your monthly budget. There's no specific food spending limit in the data, so I can't determine whether that counts as overspending.

VALID EXAMPLE -- missing budget hard stop:

question: "What percentage of my budget have I spent on food?"
dashboard: { "budget": null, "totalExpenses": "809.32", "remainingBudget": null, "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"}] }
facts: { "hasBudget": false, "categoryRanking": [{"category":"HOUSING","total":"650.00","rank":1},{"category":"FOOD","total":"145.42","rank":2}], "categoryPercentages": [{"category":"HOUSING","total":"650.00","percentageOfTotalSpending":"80.3","percentageOfBudget":null},{"category":"FOOD","total":"145.42","percentageOfTotalSpending":"18.0","percentageOfBudget":null}], "hasCategorySpecificThresholds": false }

Correct answer: I can't calculate Food's percentage of the budget because no budget is set for this period.

IMPORTANT: Do not answer this question with "Food is about 18% of your total spending." That is a different metric and does not answer the user's budget-percentage question.

VALID EXAMPLE -- missing category:

question: "How much did I spend on transportation?"
dashboard: { "categoryBreakdown": [{"category":"HOUSING","total":"650.00"},{"category":"FOOD","total":"145.42"}] }
facts: { "categoryPercentages": [{"category":"HOUSING","total":"650.00","percentageOfTotalSpending":"81.7","percentageOfBudget":"43.3"},{"category":"FOOD","total":"145.42","percentageOfTotalSpending":"18.3","percentageOfBudget":"9.7"}] }

Correct answer: I don't see any Transportation spending recorded for this month in your data, so I can't give you a spent amount for that category.

Respond with the answer text only.`

/**
 * Seeds the Finance Question Brain -- a new, standalone AI Finance Inbox
 * capability (not a migration of an existing n8n-embedded call, unlike
 * seedFinanceBrains() above). Answers an open-ended GET_FINANCE_QUESTION
 * message by reasoning over the real dashboard JSON the caller supplies in
 * `input.dashboard` -- no Finance API access of its own, no tool-calling,
 * grounded strictly in what the caller provides. Uses `expectJson: false`
 * (AiRoutingService's plain-text response path) since the answer is
 * free-form natural language for a WhatsApp reply, not a structured
 * extraction -- the first Finance Brain to use this path, deliberately
 * avoiding the JSON-wrapper failure modes ADR-0009/ADR-0011/ADR-0012 all
 * had to work around for structured-output tasks.
 */
export async function seedFinanceQuestionBrain(prisma: PrismaClient): Promise<void> {
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

  // Reuses the same mistral:7b row seedFinanceBrains() already
  // upserts/uses for finance-intent-brain -- tagged ['chat', 'reasoning']
  // (vs. expense-extraction-brain's gemma3:4b, tagged just ['chat']),
  // the better fit for a task that requires judgment over provided data,
  // not just field extraction. No new provider/model row either way --
  // this upsert is a no-op against the existing row.
  const model = await prisma.aiModel.upsert({
    where: { providerId_modelKey: { providerId: provider.id, modelKey: FINANCE_QUESTION_MODEL_KEY } },
    update: {},
    create: {
      providerId: provider.id,
      modelKey: FINANCE_QUESTION_MODEL_KEY,
      displayName: 'Mistral 7B',
      tags: ['chat', 'reasoning'],
      isEnabled: true,
    },
  })

  const brain = await prisma.aiBrain.upsert({
    where: { key: FINANCE_QUESTION_BRAIN_KEY },
    update: {},
    create: {
      key: FINANCE_QUESTION_BRAIN_KEY,
      name: 'Finance Question Answering Brain',
      description: 'Answers an open-ended GET_FINANCE_QUESTION message using only the dashboard JSON the caller supplies.',
      category: 'Finance',
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
      body: FINANCE_QUESTION_PROMPT_V1,
      isActive: true,
    },
  })

  // v2 addendum, added after this phase's live WhatsApp test surfaced a
  // real grounding failure: mistral:7b fabricated a "Transportation:
  // $13.90" category that did not exist in the supplied
  // dashboard.categoryBreakdown (which had only HOUSING/FOOD), miscounted
  // the resulting ranking as "third-largest" (impossible with two real
  // entries), and rounded 9.69% up past "over 10%". v1's body is preserved
  // verbatim above, unchanged -- only its isActive flag flips to false
  // below, following the exact "exactly one active version per brain,
  // enforced by AiPromptService" invariant this schema already documents
  // (schema.prisma's AiPrompt.isActive comment) and the same
  // deactivate-then-activate shape AiPromptRepository.activate() already
  // uses for the admin UI's own "switch active version" action.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v1', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v2' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v2',
      body: FINANCE_QUESTION_PROMPT_V2,
      isActive: true,
    },
  })

  // v3 -- see the two remaining failures the regression suite (run after
  // v2 went live) surfaced: (1) a scrambled ranking once a third real
  // category was present ("Food is third-largest... behind
  // Transportation's $13.90", when Food $145.42 > Transportation $13.90 --
  // Food is actually 2nd of 3), and (2) a wrong percentage denominator
  // ("What percentage of my budget..." answered with
  // food÷totalExpenses=17.9% instead of food÷monthlyLimit=9.69%). v2's
  // body is preserved verbatim above, unchanged -- only its isActive flag
  // flips to false below, same deactivate-then-activate shape the v1->v2
  // change already used.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v2', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v3' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v3',
      body: FINANCE_QUESTION_PROMPT_V3,
      isActive: true,
    },
  })

  // v4 -- see the two remaining issues v3's regression suite surfaced: a
  // missing-budget question silently substituted totalExpenses instead of
  // declining (the blocking failure), and a valid budget-percentage answer
  // exposed its own arithmetic despite the numeric result being correct.
  // v3's body is preserved verbatim above, unchanged -- only its isActive
  // flag flips to false below, same deactivate-then-activate shape every
  // prior version bump in this function already uses.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v3', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v4' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v4',
      body: FINANCE_QUESTION_PROMPT_V4,
      isActive: true,
    },
  })

  // v5 -- removes arithmetic from the model's job entirely. v4's body is
  // preserved verbatim above, unchanged -- only its isActive flag flips to
  // false below, same deactivate-then-activate shape every prior version
  // bump in this function already uses. Requires the Handler workflow
  // (13-handle-get-finance-question.json) to forward a `facts` key built
  // from Finance Service's dashboard response's `financeFacts` field --
  // v5 is inert/degrades to "insufficient data" answers without it, since
  // its prompt no longer instructs the model to compute anything itself.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v4', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v5' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v5',
      body: FINANCE_QUESTION_PROMPT_V5,
      isActive: true,
    },
  })

  // v6 -- see the two failures v5's regression suite surfaced: (T6) a
  // category-lookup error where a question about an absent category
  // (TRANSPORTATION) was answered with a different, present category's
  // (FOOD) real total and percentages relabeled under the requested
  // category name, and (T2) an "Am I overspending on food?" question
  // answered with an unsupported category-level verdict ("within the
  // budget") instead of citing the real numbers plus the required
  // no-category-threshold caveat. v5's body is preserved verbatim above,
  // unchanged -- only its isActive flag flips to false below, same
  // deactivate-then-activate shape every prior version bump already uses.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v5', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v6' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v6',
      body: FINANCE_QUESTION_PROMPT_V6,
      isActive: true,
    },
  })

  // v7 -- minimal, prompt-only fix for v6's one remaining deviation (T6):
  // an absent-category question was answered "You didn't spend any money
  // on transportation this month" -- an inferred zero-spending conclusion,
  // not the critical category-substitution bug v6 already fixed. v7 only
  // adds an explicit prohibition + one matching "Incorrect" example to the
  // MISSING CATEGORY RULE section; every other section is byte-identical
  // to v6. v6's body is preserved verbatim above, unchanged -- only its
  // isActive flag flips to false below, same deactivate-then-activate
  // shape every prior version bump already uses.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v6', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v7' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v7',
      body: FINANCE_QUESTION_PROMPT_V7,
      isActive: true,
    },
  })

  // v8 -- addresses the two v7 regression findings: (T5) a missing-budget
  // percentage question answered with only the total-spending metric,
  // silently omitting the required "budget percentage cannot be
  // calculated" statement, and (T4) the answer was wrapped in literal
  // quotation marks despite the existing rule against it. v7's body is
  // preserved verbatim above, unchanged -- only its isActive flag flips to
  // false below, same deactivate-then-activate shape every prior version
  // bump already uses.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v7', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v8' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v8',
      body: FINANCE_QUESTION_PROMPT_V8,
      isActive: true,
    },
  })

  // v9 -- fixes a confirmed real-WhatsApp scope-discipline bug: a plain
  // amount-only question ("How much did I spend on food?") was answered
  // with unrequested overspending/budget commentary belonging to a
  // different question. v8's body is preserved verbatim above, unchanged
  // -- only its isActive flag flips to false below, same
  // deactivate-then-activate shape every prior version bump already uses.
  await prisma.aiPrompt.updateMany({
    where: { brainId: brain.id, version: 'v8', isActive: true },
    data: { isActive: false },
  })

  await prisma.aiPrompt.upsert({
    where: { brainId_version: { brainId: brain.id, version: 'v9' } },
    update: {},
    create: {
      brainId: brain.id,
      version: 'v9',
      body: FINANCE_QUESTION_PROMPT_V9,
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
        maxRetries: 3,
        timeoutMs: 300_000,
        // Seeded for consistency with every other Brain, but inert here:
        // expectJson:false means finalParsed is always undefined, so
        // extractConfidence() always returns null and these thresholds are
        // never evaluated -- same "seeded but inert" posture
        // expense-extraction-brain's own thresholds already document.
        confidenceHighThreshold: 0.75,
        confidenceMediumThreshold: 0.4,
      },
    })
  }

  await prisma.aiCapability.upsert({
    where: { key: FINANCE_QUESTION_CAPABILITY_KEY },
    update: {},
    create: {
      key: FINANCE_QUESTION_CAPABILITY_KEY,
      name: 'Finance Question Answering',
      description: 'Answers an open-ended Finance question grounded in caller-supplied dashboard data.',
      brainId: brain.id,
      isEnabled: true,
    },
  })
}

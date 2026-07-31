export type AiProviderKind = 'LOCAL' | 'HOSTED'
export type AiMemoryStrategy = 'NONE' | 'CONVERSATION' | 'KNOWLEDGE_BASE' | 'VECTOR' | 'RAG' | 'LONG_TERM'
export type AiRoutingStrategy = 'COST' | 'LATENCY' | 'QUALITY' | 'BALANCED'
export type AiCallOutcome = 'VALID' | 'SCHEMA_INVALID' | 'TRANSIENT_FAILURE' | 'DEFINITIVE_FAILURE'
export type McpHealthStatus = 'UNKNOWN' | 'HEALTHY' | 'UNREACHABLE' | 'ERROR'
export type AiConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW'

export interface AiCapability {
  id: string
  key: string
  name: string
  description: string
  brainId: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAiCapabilityInput {
  key: string
  name: string
  description: string
  brainId: string
  isEnabled?: boolean
}

export interface AiBrain {
  id: string
  key: string
  name: string
  description: string
  category: string
  memoryStrategy: AiMemoryStrategy
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAiBrainInput {
  key: string
  name: string
  description: string
  category: string
  memoryStrategy?: AiMemoryStrategy
  isEnabled?: boolean
}

export interface AiProvider {
  id: string
  key: string
  displayName: string
  kind: AiProviderKind
  baseUrl: string | null
  isEnabled: boolean
  rateLimitPerMinute: number | null
  healthStatus: McpHealthStatus
  lastHealthCheckAt: string | null
  lastHealthMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAiProviderInput {
  key: string
  displayName: string
  kind: AiProviderKind
  baseUrl?: string
  isEnabled?: boolean
  rateLimitPerMinute?: number
}

export interface AiProviderCredential {
  id: string
  providerId: string
  label: string
  status: string
  lastVerifiedAt: string | null
  createdAt: string
}

export interface AiModel {
  id: string
  providerId: string
  modelKey: string
  displayName: string
  tags: string[]
  contextWindow: number | null
  costPerInputToken: string | null
  costPerOutputToken: string | null
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAiModelInput {
  providerId: string
  modelKey: string
  displayName: string
  tags?: string[]
  contextWindow?: number
  costPerInputToken?: number
  costPerOutputToken?: number
  isEnabled?: boolean
}

export interface AiPrompt {
  id: string
  brainId: string
  version: string
  body: string
  isActive: boolean
  createdAt: string
}

export interface AiRoutingPolicy {
  id: string
  brainId: string
  isActive: boolean
  strategy: AiRoutingStrategy
  requiredTag: string | null
  preferredProviderId: string
  preferredModelId: string
  fallbackProviderId: string | null
  fallbackModelId: string | null
  maxRetries: number
  timeoutMs: number
  confidenceHighThreshold: number
  confidenceMediumThreshold: number
  createdAt: string
}

export interface AiUsageLog {
  id: string
  brainId: string | null
  capabilityId: string | null
  providerId: string | null
  modelId: string | null
  workflowExecutionId: string | null
  domain: string
  outcome: AiCallOutcome
  retryCount: number
  tokensIn: number | null
  tokensOut: number | null
  costUsd: string | null
  latencyMs: number | null
  needsManualReview: boolean
  errorMessage: string | null
  createdAt: string
}

export type AiAuditAction =
  | 'BRAIN_CREATED'
  | 'BRAIN_UPDATED'
  | 'BRAIN_DELETED'
  | 'CAPABILITY_CREATED'
  | 'CAPABILITY_UPDATED'
  | 'CAPABILITY_DELETED'
  | 'PROVIDER_CREATED'
  | 'PROVIDER_UPDATED'
  | 'MODEL_CREATED'
  | 'MODEL_UPDATED'
  | 'MODEL_DELETED'
  | 'PROVIDER_CREDENTIAL_ADDED'
  | 'PROVIDER_CREDENTIAL_ACCESSED'
  | 'PROVIDER_CREDENTIAL_ROTATED'
  | 'ROUTING_POLICY_CHANGED'
  | 'PROMPT_VERSION_CREATED'
  | 'PROMPT_VERSION_ACTIVATED'
  | 'PROMPT_VERSION_ROLLED_BACK'
  | 'MCP_TOOL_ALLOWANCE_CHANGED'

export interface AiAuditEvent {
  id: string
  actorId: string | null
  action: AiAuditAction
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AiInvokeResult {
  output: string
  outputJson?: unknown
  capability?: string
  brain: string
  provider: string
  model: string
  promptVersion: string
  confidence: AiConfidenceTier | null
  needsManualReview: boolean
  outcome: AiCallOutcome
  retryCount: number
  latencyMs: number
}

export interface PlaygroundInvokeInput {
  capabilityKey?: string
  brainKey?: string
  input: Record<string, unknown>
  overrides?: {
    providerId?: string
    modelId?: string
    promptVersion?: string
  }
}

export interface AiCostSummary {
  totalCostUsd: string
  totalTokensIn: number
  totalTokensOut: number
  totalCalls: number
}

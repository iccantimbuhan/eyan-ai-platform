import { api } from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  AiAuditEvent,
  AiBrain,
  AiBrainMcpTool,
  AiCapability,
  AiCostSummary,
  AiEvaluation,
  AiInvokeResult,
  AiModel,
  AiPrompt,
  AiProvider,
  AiProviderCredential,
  AiRoutingPolicy,
  AiUsageLog,
  CreateAiBrainInput,
  CreateAiBrainMcpToolInput,
  CreateAiCapabilityInput,
  CreateAiModelInput,
  CreateAiPromptInput,
  CreateAiProviderInput,
  CreateAiRoutingPolicyInput,
  PlaygroundInvokeInput,
  RunAiEvaluationInput,
  UpdateAiBrainInput,
  UpdateAiCapabilityInput,
  UpdateAiModelInput,
  UpdateAiProviderInput,
} from '../types/ai-core'

export interface PageListResponse<T> {
  items: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

// Thin API client only — no business logic lives here, mirrors
// features/automation/api/automation-api.ts exactly. Every call maps 1:1 to
// an /api/v1/ai-core/* endpoint (TDD §6).
export const aiCoreApi = {
  // --- Capabilities ---
  async listCapabilities(): Promise<AiCapability[]> {
    const { data } = await api.get<ApiResponse<AiCapability[]>>('/ai-core/capabilities')
    return data.data
  },
  async createCapability(payload: CreateAiCapabilityInput): Promise<AiCapability> {
    const { data } = await api.post<ApiResponse<AiCapability>>('/ai-core/capabilities', payload)
    return data.data
  },
  async updateCapability(id: string, payload: UpdateAiCapabilityInput): Promise<AiCapability> {
    const { data } = await api.patch<ApiResponse<AiCapability>>(`/ai-core/capabilities/${id}`, payload)
    return data.data
  },
  async deleteCapability(id: string): Promise<void> {
    await api.delete(`/ai-core/capabilities/${id}`)
  },

  // --- Brains ---
  async listBrains(): Promise<AiBrain[]> {
    const { data } = await api.get<ApiResponse<AiBrain[]>>('/ai-core/brains')
    return data.data
  },
  async createBrain(payload: CreateAiBrainInput): Promise<AiBrain> {
    const { data } = await api.post<ApiResponse<AiBrain>>('/ai-core/brains', payload)
    return data.data
  },
  async updateBrain(id: string, payload: UpdateAiBrainInput): Promise<AiBrain> {
    const { data } = await api.patch<ApiResponse<AiBrain>>(`/ai-core/brains/${id}`, payload)
    return data.data
  },
  async deleteBrain(id: string): Promise<void> {
    await api.delete(`/ai-core/brains/${id}`)
  },

  // --- Prompts (nested under a Brain) ---
  async listPrompts(brainId: string): Promise<AiPrompt[]> {
    const { data } = await api.get<ApiResponse<AiPrompt[]>>(`/ai-core/brains/${brainId}/prompts`)
    return data.data
  },
  async createPrompt(brainId: string, payload: CreateAiPromptInput): Promise<AiPrompt> {
    const { data } = await api.post<ApiResponse<AiPrompt>>(`/ai-core/brains/${brainId}/prompts`, payload)
    return data.data
  },
  async activatePrompt(brainId: string, promptId: string): Promise<void> {
    await api.post(`/ai-core/brains/${brainId}/prompts/${promptId}/activate`)
  },

  // --- Routing Policy (nested under a Brain) ---
  async listRoutingPolicies(brainId: string): Promise<AiRoutingPolicy[]> {
    const { data } = await api.get<ApiResponse<AiRoutingPolicy[]>>(`/ai-core/brains/${brainId}/routing-policy`)
    return data.data
  },
  async createRoutingPolicy(brainId: string, payload: CreateAiRoutingPolicyInput): Promise<AiRoutingPolicy> {
    const { data } = await api.post<ApiResponse<AiRoutingPolicy>>(`/ai-core/brains/${brainId}/routing-policy`, payload)
    return data.data
  },
  async activateRoutingPolicy(brainId: string, policyId: string): Promise<void> {
    await api.post(`/ai-core/brains/${brainId}/routing-policy/${policyId}/activate`)
  },

  // --- MCP Tool Allowlist (nested under a Brain) ---
  async listBrainMcpTools(brainId: string): Promise<AiBrainMcpTool[]> {
    const { data } = await api.get<ApiResponse<AiBrainMcpTool[]>>(`/ai-core/brains/${brainId}/mcp-tools`)
    return data.data
  },
  async allowBrainMcpTool(brainId: string, payload: CreateAiBrainMcpToolInput): Promise<AiBrainMcpTool> {
    const { data } = await api.post<ApiResponse<AiBrainMcpTool>>(`/ai-core/brains/${brainId}/mcp-tools`, payload)
    return data.data
  },
  async revokeBrainMcpTool(brainId: string, mcpToolId: string): Promise<void> {
    await api.delete(`/ai-core/brains/${brainId}/mcp-tools/${mcpToolId}`)
  },

  // --- Evaluations (nested under a Brain's prompt) ---
  async runEvaluation(
    brainId: string,
    promptId: string,
    payload: Omit<RunAiEvaluationInput, 'promptId'>
  ): Promise<AiEvaluation> {
    const { data } = await api.post<ApiResponse<AiEvaluation>>(
      `/ai-core/brains/${brainId}/prompts/${promptId}/evaluate`,
      { ...payload, promptId }
    )
    return data.data
  },
  async listEvaluations(brainId: string, promptId: string): Promise<AiEvaluation[]> {
    const { data } = await api.get<ApiResponse<AiEvaluation[]>>(
      `/ai-core/brains/${brainId}/prompts/${promptId}/evaluations`
    )
    return data.data
  },

  // --- Providers ---
  async listProviders(): Promise<AiProvider[]> {
    const { data } = await api.get<ApiResponse<AiProvider[]>>('/ai-core/providers')
    return data.data
  },
  async listRegisteredPlugins(): Promise<string[]> {
    const { data } = await api.get<ApiResponse<string[]>>('/ai-core/providers/plugins')
    return data.data
  },
  async createProvider(payload: CreateAiProviderInput): Promise<AiProvider> {
    const { data } = await api.post<ApiResponse<AiProvider>>('/ai-core/providers', payload)
    return data.data
  },
  async updateProvider(id: string, payload: UpdateAiProviderInput): Promise<AiProvider> {
    const { data } = await api.patch<ApiResponse<AiProvider>>(`/ai-core/providers/${id}`, payload)
    return data.data
  },
  async deleteProvider(id: string): Promise<void> {
    await api.delete(`/ai-core/providers/${id}`)
  },
  async addProviderCredential(
    providerId: string,
    label: string,
    credentials: Record<string, unknown>
  ): Promise<AiProviderCredential> {
    const { data } = await api.post<ApiResponse<AiProviderCredential>>(
      `/ai-core/providers/${providerId}/credentials`,
      { label, credentials }
    )
    return data.data
  },
  async checkProviderHealth(id: string): Promise<{ status: string; message?: string }> {
    const { data } = await api.post<ApiResponse<{ status: string; message?: string }>>(
      `/ai-core/providers/${id}/health-check`
    )
    return data.data
  },

  // --- Models ---
  async listModels(providerId?: string): Promise<AiModel[]> {
    const { data } = await api.get<ApiResponse<AiModel[]>>('/ai-core/models', {
      params: providerId ? { providerId } : undefined,
    })
    return data.data
  },
  async createModel(payload: CreateAiModelInput): Promise<AiModel> {
    const { data } = await api.post<ApiResponse<AiModel>>('/ai-core/models', payload)
    return data.data
  },
  async updateModel(id: string, payload: UpdateAiModelInput): Promise<AiModel> {
    const { data } = await api.patch<ApiResponse<AiModel>>(`/ai-core/models/${id}`, payload)
    return data.data
  },
  async deleteModel(id: string): Promise<void> {
    await api.delete(`/ai-core/models/${id}`)
  },

  // --- Playground ---
  async invokePlayground(payload: PlaygroundInvokeInput): Promise<AiInvokeResult> {
    const { data } = await api.post<ApiResponse<AiInvokeResult>>('/ai-core/playground/invoke', payload)
    return data.data
  },
  async playgroundHistory(params?: { page?: number; pageSize?: number }): Promise<PageListResponse<AiUsageLog>> {
    const { data } = await api.get<PaginatedResponse<AiUsageLog>>('/ai-core/playground/history', { params })
    return { items: data.data, pagination: data.meta }
  },

  // --- Usage / Costs ---
  async listUsage(params?: { page?: number; pageSize?: number }): Promise<PageListResponse<AiUsageLog>> {
    const { data } = await api.get<PaginatedResponse<AiUsageLog>>('/ai-core/usage', { params })
    return { items: data.data, pagination: data.meta }
  },
  async getCostSummary(): Promise<AiCostSummary> {
    const { data } = await api.get<ApiResponse<AiCostSummary>>('/ai-core/costs')
    return data.data
  },

  // --- Health ---
  async healthOverview(): Promise<AiProvider[]> {
    const { data } = await api.get<ApiResponse<AiProvider[]>>('/ai-core/health')
    return data.data
  },

  // --- Audit ---
  async listAuditLogs(params?: { page?: number; pageSize?: number }): Promise<PageListResponse<AiAuditEvent>> {
    const { data } = await api.get<PaginatedResponse<AiAuditEvent>>('/ai-core/audit-logs', { params })
    return { items: data.data, pagination: data.meta }
  },
}

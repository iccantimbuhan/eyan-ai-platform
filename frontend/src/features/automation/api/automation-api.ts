import { api } from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  AutomationAuditEvent,
  AutomationConnection,
  CreateConnectionInput,
  CreateMcpServerConfigInput,
  McpHealthCheckResult,
  McpServerConfig,
  UpdateConnectionInput,
  UpdateMcpServerConfigInput,
} from '../types/automation'

export interface AuditLogListResponse {
  items: AutomationAuditEvent[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

// Thin API client only — no business logic lives here. Every call maps
// 1:1 to a Milestone 5 endpoint; nothing here re-derives anything the
// backend already decided (e.g. no client-side credential validation
// beyond what the create/rotate forms need for a usable error message).
export const automationApi = {
  async listConnections(): Promise<AutomationConnection[]> {
    const { data } = await api.get<ApiResponse<AutomationConnection[]>>(
      '/automation/connections'
    )
    return data.data
  },

  async createConnection(
    payload: CreateConnectionInput
  ): Promise<AutomationConnection> {
    const { data } = await api.post<ApiResponse<AutomationConnection>>(
      '/automation/connections',
      payload
    )
    return data.data
  },

  async updateConnection(
    id: string,
    payload: UpdateConnectionInput
  ): Promise<AutomationConnection> {
    const { data } = await api.patch<ApiResponse<AutomationConnection>>(
      `/automation/connections/${id}`,
      payload
    )
    return data.data
  },

  async deleteConnection(id: string): Promise<void> {
    await api.delete(`/automation/connections/${id}`)
  },

  async rotateConnectionCredentials(
    id: string,
    credentials: Record<string, unknown>
  ): Promise<AutomationConnection> {
    const { data } = await api.post<ApiResponse<AutomationConnection>>(
      `/automation/connections/${id}/rotate`,
      { credentials }
    )
    return data.data
  },

  async enableConnection(id: string): Promise<AutomationConnection> {
    const { data } = await api.post<ApiResponse<AutomationConnection>>(
      `/automation/connections/${id}/enable`
    )
    return data.data
  },

  async disableConnection(id: string): Promise<AutomationConnection> {
    const { data } = await api.post<ApiResponse<AutomationConnection>>(
      `/automation/connections/${id}/disable`
    )
    return data.data
  },

  async listMcpServers(): Promise<McpServerConfig[]> {
    const { data } = await api.get<ApiResponse<McpServerConfig[]>>(
      '/automation/mcp-servers'
    )
    return data.data
  },

  async listMcpProviders(): Promise<string[]> {
    const { data } = await api.get<ApiResponse<string[]>>(
      '/automation/mcp-servers/providers'
    )
    return data.data
  },

  async createMcpServer(
    payload: CreateMcpServerConfigInput
  ): Promise<McpServerConfig> {
    const { data } = await api.post<ApiResponse<McpServerConfig>>(
      '/automation/mcp-servers',
      payload
    )
    return data.data
  },

  async updateMcpServer(
    id: string,
    payload: UpdateMcpServerConfigInput
  ): Promise<McpServerConfig> {
    const { data } = await api.patch<ApiResponse<McpServerConfig>>(
      `/automation/mcp-servers/${id}`,
      payload
    )
    return data.data
  },

  async deleteMcpServer(id: string): Promise<void> {
    await api.delete(`/automation/mcp-servers/${id}`)
  },

  async checkMcpServerHealth(id: string): Promise<McpHealthCheckResult> {
    const { data } = await api.post<ApiResponse<McpHealthCheckResult>>(
      `/automation/mcp-servers/${id}/health-check`
    )
    return data.data
  },

  async listAuditLogs(params?: {
    page?: number
    pageSize?: number
  }): Promise<AuditLogListResponse> {
    const { data } = await api.get<PaginatedResponse<AutomationAuditEvent>>(
      '/automation/audit-logs',
      { params }
    )
    return { items: data.data, pagination: data.meta }
  },
}

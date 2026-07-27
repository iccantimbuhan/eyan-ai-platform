export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR'
export type McpTransport = 'STDIO' | 'HTTP' | 'SSE'
export type McpHealthStatus = 'UNKNOWN' | 'HEALTHY' | 'UNREACHABLE' | 'ERROR'

// Deliberately has no encryptedCredentials/credentialsIv field — the
// backend mapper never returns one, so the frontend type never has a slot
// for one either.
export interface AutomationConnection {
  id: string
  userId: string
  provider: string
  label: string
  status: ConnectionStatus
  metadata: Record<string, unknown> | null
  lastVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateConnectionInput {
  provider: string
  label: string
  credentials: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface UpdateConnectionInput {
  label?: string
  metadata?: Record<string, unknown>
}

export interface McpServerConfig {
  id: string
  name: string
  provider: string
  transport: McpTransport
  command: string | null
  args: string[]
  url: string | null
  connectionId: string | null
  isEnabled: boolean
  healthStatus: McpHealthStatus
  lastHealthCheckAt: string | null
  lastHealthMessage: string | null
  config: Record<string, unknown> | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface CreateMcpServerConfigInput {
  name: string
  provider: string
  transport: McpTransport
  command?: string
  args?: string[]
  url?: string
  connectionId?: string
  isEnabled?: boolean
  config?: Record<string, unknown>
}

export interface UpdateMcpServerConfigInput {
  name?: string
  transport?: McpTransport
  command?: string
  args?: string[]
  url?: string
  connectionId?: string
  isEnabled?: boolean
  config?: Record<string, unknown>
}

export interface McpHealthCheckResult {
  status: McpHealthStatus
  message?: string
  checkedAt: string
}

export type AutomationAuditAction =
  | 'CONNECTION_CREATED'
  | 'CONNECTION_TESTED'
  | 'CONNECTION_REVOKED'
  | 'MCP_SERVER_REGISTERED'
  | 'MCP_SERVER_UPDATED'
  | 'MCP_SERVER_REMOVED'
  | 'MCP_SERVER_HEALTH_CHECKED'
  | 'CREDENTIAL_ACCESSED'

export interface AutomationAuditEvent {
  id: string
  actorId: string
  action: AutomationAuditAction
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

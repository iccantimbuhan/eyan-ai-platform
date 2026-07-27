// A tool an McpConnector exposes once connected — mirrors the shape of the
// Model Context Protocol's own tool descriptors closely enough for callers
// to render/validate against without depending on an MCP SDK type here.
export interface McpTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export type McpHealthState = "healthy" | "unreachable" | "error";

export interface McpHealthCheckResult {
  status: McpHealthState;
  message?: string;
  checkedAt: Date;
}

// Non-secret connection settings resolved from McpServerConfig at connect
// time. `credentials` is the already-decrypted AutomationConnection
// payload (if the server config references one) — a connector never reads
// AutomationConnection.encryptedCredentials itself; that decryption is the
// Credential Manager's job (Sprint 7.1 Milestone 4), kept out of every
// individual connector.
export interface McpConnectorConfig {
  command?: string;
  args?: string[];
  url?: string;
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

// One connector per MCP server type (stdio process, HTTP/SSE endpoint,
// ...). Every real provider (GitHub, Canva, Slack, ...) implements this
// same interface — see McpConnectorFactory. Only FakeMcpConnector exists
// today (Sprint 7.1); real connectors are later sprints.
export interface McpConnector {
  readonly name: string;

  connect(config: McpConnectorConfig): Promise<void>;
  listTools(): Promise<McpTool[]>;
  callTool(toolName: string, args: unknown): Promise<unknown>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<McpHealthCheckResult>;
}

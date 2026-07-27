import type { McpServerConfig } from "../generated/prisma/client.js";
import type { McpServerConfigResponseDto } from "./mcp-server-config.dto.js";

export function mapMcpServerConfigToResponse(
  row: McpServerConfig
): McpServerConfigResponseDto {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    transport: row.transport,
    command: row.command,
    args: row.args,
    url: row.url,
    connectionId: row.connectionId,
    isEnabled: row.isEnabled,
    healthStatus: row.healthStatus,
    lastHealthCheckAt: row.lastHealthCheckAt,
    lastHealthMessage: row.lastHealthMessage,
    config: (row.config as Record<string, unknown> | null) ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

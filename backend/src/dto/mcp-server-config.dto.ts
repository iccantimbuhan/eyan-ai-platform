import type { McpHealthStatus, McpTransport } from "../generated/prisma/enums.js";

export interface McpServerConfigResponseDto {
  id: string;
  name: string;
  provider: string;
  transport: McpTransport;
  command: string | null;
  args: string[];
  url: string | null;
  connectionId: string | null;
  isEnabled: boolean;
  healthStatus: McpHealthStatus;
  lastHealthCheckAt: Date | null;
  lastHealthMessage: string | null;
  config: Record<string, unknown> | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMcpServerConfigDto {
  name: string;
  provider: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  connectionId?: string;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

export interface UpdateMcpServerConfigDto {
  name?: string;
  transport?: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  connectionId?: string;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

import { prisma } from "../lib/prisma.js";
import type { McpHealthStatus, McpTransport } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateMcpServerConfigData {
  name: string;
  provider: string;
  transport: McpTransport;
  command?: string | null;
  args?: string[];
  url?: string | null;
  connectionId?: string | null;
  isEnabled?: boolean;
  config?: Record<string, unknown> | null;
  createdById: string;
}

export interface UpdateMcpServerConfigData {
  name?: string;
  provider?: string;
  transport?: McpTransport;
  command?: string | null;
  args?: string[];
  url?: string | null;
  connectionId?: string | null;
  isEnabled?: boolean;
  config?: Record<string, unknown> | null;
}

// Persistence only — actually connecting to a server, calling its tools,
// and deciding what "healthy" means all live in later-milestone services
// (Connection Manager, Health Service). This repository just records what
// was registered and what the last health check reported.
export class McpServerConfigRepository {
  async create(data: CreateMcpServerConfigData) {
    return prisma.mcpServerConfig.create({
      data: {
        ...data,
        config: data.config as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async update(id: string, data: UpdateMcpServerConfigData) {
    return prisma.mcpServerConfig.update({
      where: { id },
      data: {
        ...data,
        config: data.config as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async delete(id: string) {
    return prisma.mcpServerConfig.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    return prisma.mcpServerConfig.findUnique({
      where: { id },
    });
  }

  async findAll() {
    return prisma.mcpServerConfig.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findEnabled() {
    return prisma.mcpServerConfig.findMany({
      where: { isEnabled: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateHealthStatus(
    id: string,
    healthStatus: McpHealthStatus,
    lastHealthMessage?: string | null
  ) {
    return prisma.mcpServerConfig.update({
      where: { id },
      data: {
        healthStatus,
        lastHealthMessage: lastHealthMessage ?? null,
      },
    });
  }

  async updateLastHealthCheck(id: string, checkedAt: Date) {
    return prisma.mcpServerConfig.update({
      where: { id },
      data: {
        lastHealthCheckAt: checkedAt,
      },
    });
  }
}

export const mcpServerConfigRepository = new McpServerConfigRepository();

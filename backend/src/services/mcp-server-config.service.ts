import {
  mcpServerConfigRepository,
  McpServerConfigRepository,
  type CreateMcpServerConfigData,
  type UpdateMcpServerConfigData,
} from "../repositories/mcp-server-config.repository.js";
import {
  automationAuditService,
  AutomationAuditService,
} from "./automation-audit.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { McpServerConfig } from "../generated/prisma/client.js";

// The lifecycle owner for McpServerConfig rows — CredentialManager,
// ConnectionManager, and McpHealthService (Milestone 4) cover credentials,
// connections, and health evaluation respectively, but nothing yet owns
// registering/updating/removing an MCP server config itself. Controllers
// must go through a service, never a repository, directly (Routes ->
// Controllers -> Services -> Repositories -> Prisma, per .claude/CLAUDE.md)
// — this is the service that gap requires. It's a thin CRUD orchestrator,
// the same shape as ConnectionManager minus the encryption concern (an
// McpServerConfig has no secret of its own; it only ever references one via
// connectionId).
export class McpServerConfigService {
  constructor(
    private readonly repository: McpServerConfigRepository = mcpServerConfigRepository,
    private readonly auditService: AutomationAuditService = automationAuditService
  ) {}

  async create(
    data: CreateMcpServerConfigData,
    actorId: string
  ): Promise<McpServerConfig> {
    const config = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "MCP_SERVER_REGISTERED",
      targetType: "McpServerConfig",
      targetId: config.id,
      metadata: { provider: config.provider },
    });

    return config;
  }

  async update(
    id: string,
    data: UpdateMcpServerConfigData,
    actorId: string
  ): Promise<McpServerConfig> {
    await this.getOrThrow(id);

    const updated = await this.repository.update(id, data);

    await this.auditService.record({
      actorId,
      action: "MCP_SERVER_UPDATED",
      targetType: "McpServerConfig",
      targetId: id,
    });

    return updated;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const config = await this.getOrThrow(id);

    await this.repository.delete(id);

    await this.auditService.record({
      actorId,
      action: "MCP_SERVER_REMOVED",
      targetType: "McpServerConfig",
      targetId: id,
      metadata: { provider: config.provider },
    });
  }

  async getById(id: string): Promise<McpServerConfig> {
    return this.getOrThrow(id);
  }

  async list(): Promise<McpServerConfig[]> {
    return this.repository.findAll();
  }

  async listEnabled(): Promise<McpServerConfig[]> {
    return this.repository.findEnabled();
  }

  private async getOrThrow(id: string): Promise<McpServerConfig> {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new NotFoundError("MCP server config not found.");
    }

    return config;
  }
}

export const mcpServerConfigService = new McpServerConfigService();

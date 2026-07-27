import {
  mcpServerConfigRepository,
  McpServerConfigRepository,
} from "../repositories/mcp-server-config.repository.js";
import {
  automationConnectionRepository,
  AutomationConnectionRepository,
} from "../repositories/automation-connection.repository.js";
import {
  credentialManagerService,
  CredentialManagerService,
} from "./credential-manager.service.js";
import {
  automationAuditService,
  AutomationAuditService,
} from "./automation-audit.service.js";
import { McpConnectorFactory } from "../providers/mcp-connector.factory.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { McpConnectorConfig, McpHealthState } from "../providers/interfaces/mcp-connector.js";
import type { McpHealthStatus } from "../generated/prisma/enums.js";
import type { McpServerConfig } from "../generated/prisma/client.js";

export interface HealthCheckResult {
  status: McpHealthStatus;
  message?: string;
  checkedAt: Date;
}

const STATUS_MAP: Record<McpHealthState, McpHealthStatus> = {
  healthy: "HEALTHY",
  unreachable: "UNREACHABLE",
  error: "ERROR",
};

// Orchestration only: resolves the connector via McpConnectorFactory,
// drives its connect() -> healthCheck() -> disconnect() lifecycle, then
// persists the outcome. Mirrors ImageService's split with ImageProvider —
// the connector itself never touches the database, and this service never
// implements a health check itself, only evaluates what a connector
// reports and what to do with that result.
export class McpHealthService {
  constructor(
    private readonly repository: McpServerConfigRepository = mcpServerConfigRepository,
    private readonly connectionRepository: AutomationConnectionRepository = automationConnectionRepository,
    private readonly credentialManager: CredentialManagerService = credentialManagerService,
    private readonly auditService: AutomationAuditService = automationAuditService
  ) {}

  async checkHealth(
    serverConfigId: string,
    actorId: string
  ): Promise<HealthCheckResult> {
    const config = await this.repository.findById(serverConfigId);

    if (!config) {
      throw new NotFoundError("MCP server config not found.");
    }

    const result = await this.evaluateConnector(config);

    await this.persistResult(serverConfigId, result);

    await this.auditService.record({
      actorId,
      action: "MCP_SERVER_HEALTH_CHECKED",
      targetType: "McpServerConfig",
      targetId: serverConfigId,
      metadata: { status: result.status, provider: config.provider },
    });

    return result;
  }

  private async evaluateConnector(
    config: McpServerConfig
  ): Promise<HealthCheckResult> {
    let connector;

    try {
      connector = McpConnectorFactory.create(config.provider);
    } catch (error) {
      return this.toResult("ERROR", messageOf(error, "Unregistered MCP provider."));
    }

    let connectorConfig: McpConnectorConfig;

    try {
      connectorConfig = await this.buildConnectorConfig(config);
    } catch (error) {
      return this.toResult(
        "ERROR",
        messageOf(error, "Failed to resolve connector credentials.")
      );
    }

    try {
      await connector.connect(connectorConfig);
      const health = await connector.healthCheck();
      await connector.disconnect();

      return this.toResult(STATUS_MAP[health.status], health.message);
    } catch (error) {
      return this.toResult("ERROR", messageOf(error, "Health check failed."));
    }
  }

  private async buildConnectorConfig(
    config: McpServerConfig
  ): Promise<McpConnectorConfig> {
    const base: McpConnectorConfig = {
      command: config.command ?? undefined,
      args: config.args,
      url: config.url ?? undefined,
      settings: (config.config as Record<string, unknown> | null) ?? undefined,
    };

    if (!config.connectionId) {
      return base;
    }

    // System-internal lookup — a health check is a system operation, not a
    // user request, so credential resolution is not owner-scoped the way
    // AutomationConnectionService.reveal() is. Whether this McpServerConfig
    // was allowed to reference this connection was already enforced when
    // the link was created (Milestone 5's controller layer).
    const connection = await this.connectionRepository.findByIdForSystem(
      config.connectionId
    );

    if (!connection) {
      return base;
    }

    const credentials = this.credentialManager.decrypt(
      connection.encryptedCredentials,
      connection.credentialsIv
    );

    return { ...base, credentials };
  }

  private async persistResult(
    serverConfigId: string,
    result: HealthCheckResult
  ): Promise<void> {
    await this.repository.updateHealthStatus(
      serverConfigId,
      result.status,
      result.message ?? null
    );
    await this.repository.updateLastHealthCheck(
      serverConfigId,
      result.checkedAt
    );
  }

  private toResult(status: McpHealthStatus, message?: string): HealthCheckResult {
    return { status, message, checkedAt: new Date() };
  }
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const mcpHealthService = new McpHealthService();

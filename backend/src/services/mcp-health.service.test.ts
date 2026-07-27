import { beforeEach, describe, expect, it, vi } from "vitest";

import { McpHealthService } from "./mcp-health.service.js";
import { McpConnectorFactory } from "../providers/mcp-connector.factory.js";
import type {
  McpConnector,
  McpConnectorConfig,
  McpHealthCheckResult,
  McpTool,
} from "../providers/interfaces/mcp-connector.js";

class ScriptedConnector implements McpConnector {
  readonly name = "scripted";

  constructor(
    private readonly behavior: {
      connect?: () => Promise<void>;
      healthCheck?: () => Promise<McpHealthCheckResult>;
    } = {}
  ) {}

  async connect(_config: McpConnectorConfig): Promise<void> {
    if (this.behavior.connect) return this.behavior.connect();
  }

  async listTools(): Promise<McpTool[]> {
    return [];
  }

  async callTool(): Promise<unknown> {
    return null;
  }

  async disconnect(): Promise<void> {}

  async healthCheck(): Promise<McpHealthCheckResult> {
    if (this.behavior.healthCheck) return this.behavior.healthCheck();
    return { status: "healthy", checkedAt: new Date() };
  }
}

let scriptedBehavior: ConstructorParameters<typeof ScriptedConnector>[0] = {};

function registerScripted() {
  class Wrapper extends ScriptedConnector {
    constructor() {
      super(scriptedBehavior);
    }
  }
  McpConnectorFactory.register("scripted", Wrapper);
}

function createServerConfigRepository(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    findById: vi.fn().mockResolvedValue({
      id: "mcp-1",
      provider: "scripted",
      command: null,
      args: [],
      url: null,
      config: null,
      connectionId: null,
    }),
    updateHealthStatus: vi.fn().mockResolvedValue({}),
    updateLastHealthCheck: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createConnectionRepository(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    findByIdForSystem: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function createCredentialManager(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    decrypt: vi.fn().mockReturnValue({ apiKey: "secret" }),
    ...overrides,
  };
}

function createAuditService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    record: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("McpHealthService", () => {
  beforeEach(() => {
    McpConnectorFactory.reset();
    scriptedBehavior = {};
    registerScripted();
  });

  it("persists HEALTHY when the connector reports healthy", async () => {
    scriptedBehavior = {
      healthCheck: async () => ({ status: "healthy", checkedAt: new Date() }),
    };

    const serverConfigRepository = createServerConfigRepository();
    const service = new McpHealthService(
      serverConfigRepository as never,
      createConnectionRepository() as never,
      createCredentialManager() as never,
      createAuditService() as never
    );

    const result = await service.checkHealth("mcp-1", "user-1");

    expect(result.status).toBe("HEALTHY");
    expect(serverConfigRepository.updateHealthStatus).toHaveBeenCalledWith(
      "mcp-1",
      "HEALTHY",
      null
    );
    expect(serverConfigRepository.updateLastHealthCheck).toHaveBeenCalledWith(
      "mcp-1",
      expect.any(Date)
    );
  });

  it("persists UNREACHABLE when the connector reports unreachable", async () => {
    scriptedBehavior = {
      healthCheck: async () => ({
        status: "unreachable",
        message: "no response",
        checkedAt: new Date(),
      }),
    };

    const serverConfigRepository = createServerConfigRepository();
    const service = new McpHealthService(
      serverConfigRepository as never,
      createConnectionRepository() as never,
      createCredentialManager() as never,
      createAuditService() as never
    );

    const result = await service.checkHealth("mcp-1", "user-1");

    expect(result.status).toBe("UNREACHABLE");
    expect(serverConfigRepository.updateHealthStatus).toHaveBeenCalledWith(
      "mcp-1",
      "UNREACHABLE",
      "no response"
    );
  });

  it("persists ERROR when connect() throws", async () => {
    scriptedBehavior = {
      connect: async () => {
        throw new Error("boom");
      },
    };

    const serverConfigRepository = createServerConfigRepository();
    const auditService = createAuditService();
    const service = new McpHealthService(
      serverConfigRepository as never,
      createConnectionRepository() as never,
      createCredentialManager() as never,
      auditService as never
    );

    const result = await service.checkHealth("mcp-1", "user-1");

    expect(result.status).toBe("ERROR");
    expect(result.message).toBe("boom");
    expect(serverConfigRepository.updateHealthStatus).toHaveBeenCalledWith(
      "mcp-1",
      "ERROR",
      "boom"
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MCP_SERVER_HEALTH_CHECKED" })
    );
  });

  it("persists ERROR for an unregistered provider without throwing", async () => {
    const serverConfigRepository = createServerConfigRepository({
      findById: vi.fn().mockResolvedValue({
        id: "mcp-1",
        provider: "not-registered",
        command: null,
        args: [],
        url: null,
        config: null,
        connectionId: null,
      }),
    });
    const service = new McpHealthService(
      serverConfigRepository as never,
      createConnectionRepository() as never,
      createCredentialManager() as never,
      createAuditService() as never
    );

    const result = await service.checkHealth("mcp-1", "user-1");

    expect(result.status).toBe("ERROR");
    expect(serverConfigRepository.updateHealthStatus).toHaveBeenCalledWith(
      "mcp-1",
      "ERROR",
      expect.stringContaining("Unsupported MCP connector")
    );
  });

  it("throws NotFoundError when the server config does not exist", async () => {
    const serverConfigRepository = createServerConfigRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = new McpHealthService(
      serverConfigRepository as never,
      createConnectionRepository() as never,
      createCredentialManager() as never,
      createAuditService() as never
    );

    await expect(service.checkHealth("missing", "user-1")).rejects.toThrow(
      "MCP server config not found."
    );
  });

  it("resolves and decrypts credentials via CredentialManager when connectionId is set", async () => {
    let receivedConfig: McpConnectorConfig | undefined;
    scriptedBehavior = {
      connect: async () => {},
    };

    class CapturingConnector extends ScriptedConnector {
      override async connect(config: McpConnectorConfig): Promise<void> {
        receivedConfig = config;
      }
    }
    McpConnectorFactory.reset();
    McpConnectorFactory.register("scripted", CapturingConnector);

    const serverConfigRepository = createServerConfigRepository({
      findById: vi.fn().mockResolvedValue({
        id: "mcp-1",
        provider: "scripted",
        command: null,
        args: [],
        url: null,
        config: null,
        connectionId: "conn-1",
      }),
    });
    const connectionRepository = createConnectionRepository({
      findByIdForSystem: vi.fn().mockResolvedValue({
        id: "conn-1",
        encryptedCredentials: "cipher",
        credentialsIv: "iv",
      }),
    });
    const credentialManager = createCredentialManager();

    const service = new McpHealthService(
      serverConfigRepository as never,
      connectionRepository as never,
      credentialManager as never,
      createAuditService() as never
    );

    await service.checkHealth("mcp-1", "user-1");

    expect(connectionRepository.findByIdForSystem).toHaveBeenCalledWith(
      "conn-1"
    );
    expect(credentialManager.decrypt).toHaveBeenCalledWith("cipher", "iv");
    expect(receivedConfig?.credentials).toEqual({ apiKey: "secret" });
  });
});

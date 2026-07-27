import { logger } from "../../lib/logger.js";
import type {
  McpConnector,
  McpConnectorConfig,
  McpHealthCheckResult,
  McpTool,
} from "../interfaces/mcp-connector.js";

const ECHO_TOOL_NAME = "echo";

// Deterministic, in-process placeholder — no network calls, no child
// process spawned. Exists so the full MCP pipeline (registration ->
// connect -> listTools -> callTool -> healthCheck) can be exercised and
// tested end-to-end before any real, credential-bearing connector
// (GitHub, Canva, Slack, ...) is integrated in a later sprint — the same
// role FakeImageProvider played before Sprint 4.2's first real image
// provider. Registered under the name "fake" — see
// register-mcp-connectors.ts.
export class FakeMcpConnector implements McpConnector {
  readonly name = "fake";

  private connected = false;

  async connect(_config: McpConnectorConfig): Promise<void> {
    logger.debug("[FakeMcpConnector] Connecting (no-op, in-process).");
    this.connected = true;
  }

  async listTools(): Promise<McpTool[]> {
    this.assertConnected();

    return [
      {
        name: ECHO_TOOL_NAME,
        description: "Echoes back whatever input it is given.",
        inputSchema: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    ];
  }

  async callTool(toolName: string, args: unknown): Promise<unknown> {
    this.assertConnected();

    if (toolName !== ECHO_TOOL_NAME) {
      throw new Error(`FakeMcpConnector has no tool named "${toolName}".`);
    }

    return { echoed: args };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<McpHealthCheckResult> {
    return {
      status: this.connected ? "healthy" : "unreachable",
      message: this.connected
        ? "Fake connector is always healthy once connected."
        : "Not connected — call connect() first.",
      checkedAt: new Date(),
    };
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error("FakeMcpConnector is not connected. Call connect() first.");
    }
  }
}

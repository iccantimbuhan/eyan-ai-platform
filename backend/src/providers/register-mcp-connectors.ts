import { McpConnectorFactory } from "./mcp-connector.factory.js";
import { FakeMcpConnector } from "./mcp/fake-mcp.connector.js";
import { logger } from "../lib/logger.js";

// Called once at application startup (see app.ts). Real connectors
// (GitHub, Canva, Docker, Slack, ...) register themselves here in later
// sprints — no other file (McpConnectorFactory itself, the automation
// services built in Milestone 4, routes, or validators) needs to change
// when one is added.
export function registerMcpConnectors(): void {
  McpConnectorFactory.register("fake", FakeMcpConnector);
}

// Unlike validateImageProviderConfig(), there is no single configured
// default provider to check against — McpConnectorFactory has no env-var
// default (see mcp-connector.factory.ts). This just guards against the
// registry silently ending up empty (e.g. a future refactor removing the
// registerMcpConnectors() call from app.ts by mistake).
export function validateMcpConnectorConfig(): void {
  const registered = McpConnectorFactory.listRegistered();

  if (registered.length === 0) {
    logger.warn("[McpConnectorFactory] No MCP connectors are registered.");
  }
}

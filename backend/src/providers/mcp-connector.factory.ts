import { logger } from "../lib/logger.js";
import { UnsupportedMcpConnectorError } from "../errors/mcp-connector.error.js";
import type { McpConnector } from "./interfaces/mcp-connector.js";

type McpConnectorConstructor = new () => McpConnector;

// Mirrors PlatformProviderFactory's registry shape, not ImageProviderFactory's
// env-var-default shape: multiple MCP servers are meant to be configured and
// connected simultaneously (one McpServerConfig row per instance), so there
// is no single "the" MCP provider the way IMAGE_PROVIDER names one default
// image provider. Every caller passes an explicit provider name, resolved
// from the McpServerConfig row it's acting on. Adding a real connector
// (GitHub, Canva, Slack, ...) later is one class + one register() call —
// zero changes to this factory or any of its callers.
export class McpConnectorFactory {
  private static readonly registry = new Map<string, McpConnectorConstructor>();

  static register(name: string, connector: McpConnectorConstructor): void {
    const key = normalizeName(name);

    if (this.registry.has(key)) {
      logger.warn(
        `[McpConnectorFactory] Overwriting already-registered connector "${key}".`
      );
    }

    this.registry.set(key, connector);
  }

  static create(providerName: string): McpConnector {
    const key = normalizeName(providerName);
    const Connector = this.registry.get(key);

    if (!Connector) {
      throw new UnsupportedMcpConnectorError(providerName);
    }

    return new Connector();
  }

  static listRegistered(): string[] {
    return Array.from(this.registry.keys());
  }

  static reset(): void {
    this.registry.clear();
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

import { beforeEach, describe, expect, it } from "vitest";

import { McpConnectorFactory } from "./mcp-connector.factory.js";
import type {
  McpConnector,
  McpConnectorConfig,
  McpHealthCheckResult,
  McpTool,
} from "./interfaces/mcp-connector.js";
import { UnsupportedMcpConnectorError } from "../errors/mcp-connector.error.js";

class StubMcpConnector implements McpConnector {
  readonly name = "stub";

  async connect(_config: McpConnectorConfig): Promise<void> {}

  async listTools(): Promise<McpTool[]> {
    return [];
  }

  async callTool(_toolName: string, args: unknown): Promise<unknown> {
    return args;
  }

  async disconnect(): Promise<void> {}

  async healthCheck(): Promise<McpHealthCheckResult> {
    return { status: "healthy", checkedAt: new Date() };
  }
}

describe("McpConnectorFactory", () => {
  beforeEach(() => {
    McpConnectorFactory.reset();
  });

  it("has no connectors registered by default", () => {
    expect(McpConnectorFactory.listRegistered()).toEqual([]);
  });

  it("registers a connector and creates it by name", () => {
    McpConnectorFactory.register("stub", StubMcpConnector);

    const connector = McpConnectorFactory.create("stub");

    expect(connector).toBeInstanceOf(StubMcpConnector);
    expect(connector.name).toBe("stub");
  });

  it("resolves connector names case-insensitively and trims whitespace", () => {
    McpConnectorFactory.register("Stub", StubMcpConnector);

    expect(McpConnectorFactory.create(" STUB ")).toBeInstanceOf(
      StubMcpConnector
    );
    expect(McpConnectorFactory.listRegistered()).toEqual(["stub"]);
  });

  it("throws UnsupportedMcpConnectorError for an unregistered provider", () => {
    expect(() => McpConnectorFactory.create("github")).toThrow(
      UnsupportedMcpConnectorError
    );
  });

  it("throws UnsupportedMcpConnectorError when no provider name is given", () => {
    expect(() => McpConnectorFactory.create("")).toThrow(
      UnsupportedMcpConnectorError
    );
  });

  it("lists every registered connector name", () => {
    McpConnectorFactory.register("stub-a", StubMcpConnector);
    McpConnectorFactory.register("stub-b", StubMcpConnector);

    expect(McpConnectorFactory.listRegistered().sort()).toEqual([
      "stub-a",
      "stub-b",
    ]);
  });

  it("allows re-registering a name (overwrite), logging a warning rather than throwing", () => {
    class OtherStubConnector extends StubMcpConnector {
      override readonly name = "stub";
    }

    McpConnectorFactory.register("stub", StubMcpConnector);
    McpConnectorFactory.register("stub", OtherStubConnector);

    expect(McpConnectorFactory.create("stub")).toBeInstanceOf(
      OtherStubConnector
    );
    expect(McpConnectorFactory.listRegistered()).toEqual(["stub"]);
  });
});

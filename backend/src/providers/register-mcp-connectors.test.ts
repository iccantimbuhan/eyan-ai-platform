import { beforeEach, describe, expect, it } from "vitest";

import {
  registerMcpConnectors,
  validateMcpConnectorConfig,
} from "./register-mcp-connectors.js";
import { McpConnectorFactory } from "./mcp-connector.factory.js";
import { FakeMcpConnector } from "./mcp/fake-mcp.connector.js";

describe("registerMcpConnectors", () => {
  beforeEach(() => {
    McpConnectorFactory.reset();
  });

  it("registers the fake connector", () => {
    registerMcpConnectors();

    expect(McpConnectorFactory.listRegistered()).toEqual(["fake"]);
    expect(McpConnectorFactory.create("fake")).toBeInstanceOf(
      FakeMcpConnector
    );
  });
});

describe("validateMcpConnectorConfig", () => {
  beforeEach(() => {
    McpConnectorFactory.reset();
  });

  it("does not throw when at least one connector is registered", () => {
    registerMcpConnectors();

    expect(() => validateMcpConnectorConfig()).not.toThrow();
  });

  it("does not throw even when the registry is empty (warns instead)", () => {
    expect(() => validateMcpConnectorConfig()).not.toThrow();
  });
});

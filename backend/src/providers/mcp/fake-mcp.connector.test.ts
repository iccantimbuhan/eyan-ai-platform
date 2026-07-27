import { beforeEach, describe, expect, it } from "vitest";

import { FakeMcpConnector } from "./fake-mcp.connector.js";

describe("FakeMcpConnector", () => {
  let connector: FakeMcpConnector;

  beforeEach(() => {
    connector = new FakeMcpConnector();
  });

  it("reports name 'fake'", () => {
    expect(connector.name).toBe("fake");
  });

  it("is unreachable before connect() is called", async () => {
    const result = await connector.healthCheck();

    expect(result.status).toBe("unreachable");
  });

  it("becomes healthy after connect()", async () => {
    await connector.connect({});

    const result = await connector.healthCheck();

    expect(result.status).toBe("healthy");
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it("becomes unreachable again after disconnect()", async () => {
    await connector.connect({});
    await connector.disconnect();

    const result = await connector.healthCheck();

    expect(result.status).toBe("unreachable");
  });

  it("lists the echo tool once connected", async () => {
    await connector.connect({});

    const tools = await connector.listTools();

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("echo");
  });

  it("throws when listing tools before connect()", async () => {
    await expect(connector.listTools()).rejects.toThrow(/not connected/i);
  });

  it("echoes back the given args when calling the echo tool", async () => {
    await connector.connect({});

    const result = await connector.callTool("echo", { message: "hello" });

    expect(result).toEqual({ echoed: { message: "hello" } });
  });

  it("throws for an unknown tool name", async () => {
    await connector.connect({});

    await expect(connector.callTool("not-a-real-tool", {})).rejects.toThrow(
      /no tool named/i
    );
  });

  it("throws when calling a tool before connect()", async () => {
    await expect(connector.callTool("echo", {})).rejects.toThrow(
      /not connected/i
    );
  });
});

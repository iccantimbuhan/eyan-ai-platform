import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const deleteMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    aiBrainMcpTool: {
      create: createMock,
      delete: deleteMock,
      findMany: findManyMock,
    },
  },
}));

const { AiBrainMcpToolRepository } = await import("./ai-brain-mcp-tool.repository.js");

describe("AiBrainMcpToolRepository", () => {
  const repository = new AiBrainMcpToolRepository();

  beforeEach(() => {
    createMock.mockReset();
    deleteMock.mockReset();
    findManyMock.mockReset();
  });

  it("creates an allowance", async () => {
    createMock.mockResolvedValue({});

    await repository.create({ brainId: "brain-1", mcpServerConfigId: "server-1", allowedTools: ["search"] });

    expect(createMock).toHaveBeenCalledWith({
      data: { brainId: "brain-1", mcpServerConfigId: "server-1", allowedTools: ["search"] },
    });
  });

  it("deletes an allowance by id", async () => {
    deleteMock.mockResolvedValue({});

    await repository.delete("allowance-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "allowance-1" } });
  });

  it("lists allowances for a brain, including the joined MCP server config", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.listByBrain("brain-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { brainId: "brain-1" },
      include: { mcpServerConfig: true },
    });
  });
});

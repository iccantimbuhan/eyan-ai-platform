import { prisma } from "../lib/prisma.js";

export interface CreateAiBrainMcpToolData {
  brainId: string;
  mcpServerConfigId: string;
  allowedTools?: string[];
}

// Thin join persistence only — MCP Foundation's McpConnectorFactory/
// CredentialManagerService/connector implementations are never touched by
// AI Core (TDD §12).
export class AiBrainMcpToolRepository {
  async create(data: CreateAiBrainMcpToolData) {
    return prisma.aiBrainMcpTool.create({ data });
  }

  async delete(id: string) {
    return prisma.aiBrainMcpTool.delete({ where: { id } });
  }

  async listByBrain(brainId: string) {
    return prisma.aiBrainMcpTool.findMany({
      where: { brainId },
      include: { mcpServerConfig: true },
    });
  }
}

export const aiBrainMcpToolRepository = new AiBrainMcpToolRepository();

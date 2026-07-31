import {
  aiBrainMcpToolRepository,
  AiBrainMcpToolRepository,
  type CreateAiBrainMcpToolData,
} from "../repositories/ai-brain-mcp-tool.repository.js";
import { aiAuditService, AiAuditService } from "./ai-audit.service.js";

// Thin orchestrator over the Brain <-> McpServerConfig join (TDD §12) — no
// new tool registry, no touching McpConnectorFactory/CredentialManagerService.
export class AiBrainMcpToolService {
  constructor(
    private readonly repository: AiBrainMcpToolRepository = aiBrainMcpToolRepository,
    private readonly auditService: AiAuditService = aiAuditService
  ) {}

  async allow(data: CreateAiBrainMcpToolData, actorId: string) {
    const allowance = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "MCP_TOOL_ALLOWANCE_CHANGED",
      targetType: "AiBrainMcpTool",
      targetId: allowance.id,
      metadata: { brainId: data.brainId, mcpServerConfigId: data.mcpServerConfigId },
    });

    return allowance;
  }

  async revoke(id: string, brainId: string, actorId: string) {
    await this.repository.delete(id);

    await this.auditService.record({
      actorId,
      action: "MCP_TOOL_ALLOWANCE_CHANGED",
      targetType: "AiBrainMcpTool",
      targetId: id,
      metadata: { brainId, revoked: true },
    });
  }

  async listByBrain(brainId: string) {
    return this.repository.listByBrain(brainId);
  }
}

export const aiBrainMcpToolService = new AiBrainMcpToolService();

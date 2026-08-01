import type { AiBrainMcpTool } from "../generated/prisma/client.js";
import type { AiBrainMcpToolResponseDto } from "./ai-brain-mcp-tool.dto.js";

export function mapAiBrainMcpToolToResponse(row: AiBrainMcpTool): AiBrainMcpToolResponseDto {
  return {
    id: row.id,
    brainId: row.brainId,
    mcpServerConfigId: row.mcpServerConfigId,
    allowedTools: row.allowedTools,
  };
}

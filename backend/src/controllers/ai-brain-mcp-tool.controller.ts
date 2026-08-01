import type { Request, Response } from "express";

import { aiBrainMcpToolService } from "../services/ai-brain-mcp-tool.service.js";
import { mapAiBrainMcpToolToResponse } from "../dto/ai-brain-mcp-tool.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiBrainMcpToolController {
  static async allow(req: Request, res: Response) {
    const allowance = await aiBrainMcpToolService.allow(
      {
        brainId: req.params.brainId as string,
        mcpServerConfigId: req.body.mcpServerConfigId,
        allowedTools: req.body.allowedTools,
      },
      req.user.id
    );

    return ApiResponse.success(res, mapAiBrainMcpToolToResponse(allowance), 201, "MCP tool allowance added successfully.");
  }

  static async revoke(req: Request, res: Response) {
    await aiBrainMcpToolService.revoke(req.params.mcpToolId as string, req.params.brainId as string, req.user.id);
    return ApiResponse.success(res, null, 200, "MCP tool allowance revoked successfully.");
  }

  static async list(req: Request, res: Response) {
    const allowances = await aiBrainMcpToolService.listByBrain(req.params.brainId as string);
    return ApiResponse.success(res, allowances.map(mapAiBrainMcpToolToResponse), 200, "MCP tool allowances retrieved successfully.");
  }
}

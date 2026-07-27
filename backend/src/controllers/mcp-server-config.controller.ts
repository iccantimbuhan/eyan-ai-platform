import type { Request, Response } from "express";

import { McpServerConfigService } from "../services/mcp-server-config.service.js";
import { McpHealthService } from "../services/mcp-health.service.js";
import { McpConnectorFactory } from "../providers/mcp-connector.factory.js";
import { mapMcpServerConfigToResponse } from "../dto/mcp-server-config.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

const mcpServerConfigService = new McpServerConfigService();
const mcpHealthService = new McpHealthService();

export class McpServerConfigController {
  static async createServerConfig(req: Request, res: Response) {
    const config = await mcpServerConfigService.create(
      {
        name: req.body.name,
        provider: req.body.provider,
        transport: req.body.transport,
        command: req.body.command ?? null,
        args: req.body.args,
        url: req.body.url ?? null,
        connectionId: req.body.connectionId ?? null,
        isEnabled: req.body.isEnabled,
        config: req.body.config ?? null,
        createdById: req.user.id,
      },
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapMcpServerConfigToResponse(config),
      201,
      "MCP server registered successfully."
    );
  }

  static async getServerConfigs(_req: Request, res: Response) {
    const configs = await mcpServerConfigService.list();

    return ApiResponse.success(
      res,
      configs.map(mapMcpServerConfigToResponse),
      200,
      "MCP servers retrieved successfully."
    );
  }

  // Registered connector names from McpConnectorFactory ("fake" only until
  // a later sprint registers a real one) — lets the frontend populate a
  // provider picker before creating a connection or server config, without
  // exposing the registry's internal Map shape directly.
  static async listProviders(_req: Request, res: Response) {
    return ApiResponse.success(
      res,
      McpConnectorFactory.listRegistered(),
      200,
      "Registered MCP providers retrieved successfully."
    );
  }

  static async getServerConfig(req: Request, res: Response) {
    const config = await mcpServerConfigService.getById(
      req.params.id as string
    );

    return ApiResponse.success(
      res,
      mapMcpServerConfigToResponse(config),
      200,
      "MCP server retrieved successfully."
    );
  }

  static async updateServerConfig(req: Request, res: Response) {
    const config = await mcpServerConfigService.update(
      req.params.id as string,
      {
        name: req.body.name,
        transport: req.body.transport,
        command: req.body.command,
        args: req.body.args,
        url: req.body.url,
        connectionId: req.body.connectionId,
        isEnabled: req.body.isEnabled,
        config: req.body.config,
      },
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapMcpServerConfigToResponse(config),
      200,
      "MCP server updated successfully."
    );
  }

  static async deleteServerConfig(req: Request, res: Response) {
    await mcpServerConfigService.delete(req.params.id as string, req.user.id);

    return ApiResponse.success(res, null, 200, "MCP server removed successfully.");
  }

  static async checkHealth(req: Request, res: Response) {
    const result = await mcpHealthService.checkHealth(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(res, result, 200, "Health check completed.");
  }
}

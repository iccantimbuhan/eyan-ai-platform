import type { Request, Response } from "express";

import { AutomationConnectionService } from "../services/automation-connection.service.js";
import { mapAutomationConnectionToResponse } from "../dto/automation-connection.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

const automationConnectionService = new AutomationConnectionService();

export class AutomationConnectionController {
  static async createConnection(req: Request, res: Response) {
    const connection = await automationConnectionService.create({
      userId: req.user.id,
      provider: req.body.provider,
      label: req.body.label,
      credentials: req.body.credentials,
      metadata: req.body.metadata ?? null,
    });

    return ApiResponse.success(
      res,
      mapAutomationConnectionToResponse(connection),
      201,
      "Connection created successfully."
    );
  }

  static async getConnections(req: Request, res: Response) {
    const connections = await automationConnectionService.listForUser(
      req.user.id
    );

    return ApiResponse.success(
      res,
      connections.map(mapAutomationConnectionToResponse),
      200,
      "Connections retrieved successfully."
    );
  }

  static async getConnection(req: Request, res: Response) {
    const connection = await automationConnectionService.getById(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapAutomationConnectionToResponse(connection),
      200,
      "Connection retrieved successfully."
    );
  }

  static async updateConnection(req: Request, res: Response) {
    const connection = await automationConnectionService.update(
      req.params.id as string,
      req.user.id,
      {
        label: req.body.label,
        metadata: req.body.metadata,
      }
    );

    return ApiResponse.success(
      res,
      mapAutomationConnectionToResponse(connection),
      200,
      "Connection updated successfully."
    );
  }

  static async deleteConnection(req: Request, res: Response) {
    await automationConnectionService.delete(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(res, null, 200, "Connection deleted successfully.");
  }

  static async rotateCredentials(req: Request, res: Response) {
    const connection = await automationConnectionService.rotateCredentials(
      req.params.id as string,
      req.user.id,
      req.body.credentials
    );

    return ApiResponse.success(
      res,
      mapAutomationConnectionToResponse(connection),
      200,
      "Connection credentials rotated successfully."
    );
  }

  static async enableConnection(req: Request, res: Response) {
    const connection = await automationConnectionService.enable(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapAutomationConnectionToResponse(connection),
      200,
      "Connection enabled successfully."
    );
  }

  static async disableConnection(req: Request, res: Response) {
    const connection = await automationConnectionService.disable(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapAutomationConnectionToResponse(connection),
      200,
      "Connection disabled successfully."
    );
  }
}

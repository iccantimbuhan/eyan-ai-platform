import type { Request, Response } from "express";

import { AutomationAuditService } from "../services/automation-audit.service.js";
import { mapAutomationAuditEventToResponse } from "../dto/automation-audit-event.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

const automationAuditService = new AutomationAuditService();

export class AutomationAuditLogController {
  static async getRecentAuditLogs(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;

    const result = await automationAuditService.listRecent(page, pageSize);

    return ApiResponse.paginated(
      res,
      result.data.map(mapAutomationAuditEventToResponse),
      {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
      200,
      "Audit logs retrieved successfully."
    );
  }

  static async getConnectionAuditLogs(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;

    const result = await automationAuditService.listByConnection(
      req.params.connectionId as string,
      page,
      pageSize
    );

    return ApiResponse.paginated(
      res,
      result.data.map(mapAutomationAuditEventToResponse),
      {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
      200,
      "Connection audit logs retrieved successfully."
    );
  }
}

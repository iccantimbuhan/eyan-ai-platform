import type { Request, Response } from "express";

import { aiAuditService } from "../services/ai-audit.service.js";
import { mapAiAuditEventToResponse } from "../dto/ai-audit-event.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiAuditController {
  static async listRecent(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const result = await aiAuditService.listRecent(page, pageSize);

    return ApiResponse.paginated(
      res,
      result.data.map(mapAiAuditEventToResponse),
      { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: Math.ceil(result.total / result.pageSize) },
      200,
      "AI Core audit log retrieved successfully."
    );
  }
}

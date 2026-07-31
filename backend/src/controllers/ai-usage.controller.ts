import type { Request, Response } from "express";

import { aiUsageService } from "../services/ai-usage.service.js";
import { mapAiUsageLogToResponse } from "../dto/ai-usage-log.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

// Both endpoints read from AiUsageLog filtered to domain="ai-core" only
// (AiUsageService.listUsage/getCostSummary force this) — Playground traffic
// never appears here, only in AiPlaygroundController.history (TDD §13).
export class AiUsageController {
  static async list(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const result = await aiUsageService.listUsage(page, pageSize);

    return ApiResponse.paginated(
      res,
      result.data.map(mapAiUsageLogToResponse),
      { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: Math.ceil(result.total / result.pageSize) },
      200,
      "AI Core usage retrieved successfully."
    );
  }

  static async costSummary(_req: Request, res: Response) {
    const summary = await aiUsageService.getCostSummary();

    return ApiResponse.success(
      res,
      {
        totalCostUsd: summary._sum.costUsd?.toString() ?? "0",
        totalTokensIn: summary._sum.tokensIn ?? 0,
        totalTokensOut: summary._sum.tokensOut ?? 0,
        totalCalls: summary._count._all,
      },
      200,
      "AI Core cost summary retrieved successfully."
    );
  }
}

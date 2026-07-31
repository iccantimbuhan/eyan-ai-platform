import type { Request, Response } from "express";

import { aiPlaygroundService } from "../services/ai-playground.service.js";
import { mapAiUsageLogToResponse } from "../dto/ai-usage-log.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

export class AiPlaygroundController {
  static async invoke(req: Request, res: Response) {
    const result = await aiPlaygroundService.invoke(
      {
        capabilityKey: req.body.capabilityKey,
        brainKey: req.body.brainKey,
        input: req.body.input,
        overrides: req.body.overrides,
      },
      req.user.id
    );

    return ApiResponse.success(res, result, 200, "Playground execution completed.");
  }

  static async history(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const result = await aiPlaygroundService.history(page, pageSize);

    return ApiResponse.paginated(
      res,
      result.data.map(mapAiUsageLogToResponse),
      { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: Math.ceil(result.total / result.pageSize) },
      200,
      "Playground history retrieved successfully."
    );
  }
}

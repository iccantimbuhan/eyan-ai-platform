import type { Request, Response } from "express";

import { VideoExecutionEngineService } from "../services/video-execution-engine.service.js";
import { mapVideoAssetToResponse } from "../dto/video-asset.mapper.js";
import { ApiResponse } from "../utils/api-response.js";
import { ExecuteWorkflowSchema } from "../validators/video-execution.validator.js";

const videoExecutionEngineService = new VideoExecutionEngineService();

// Zod-inline validation, matching ChatController/VideoWorkflowPlannerController
// — a JSON body endpoint, not multipart.
export class VideoExecutionController {
  static async execute(req: Request, res: Response) {
    const parsed = ExecuteWorkflowSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Validation error";
      return ApiResponse.error(res, message, 400);
    }

    const edited = await videoExecutionEngineService.execute(parsed.data, req.user.id);

    return ApiResponse.success(
      res,
      mapVideoAssetToResponse(edited),
      201,
      "Workflow executed successfully."
    );
  }
}

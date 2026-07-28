import type { Request, Response } from "express";

import { VideoWorkflowPlannerService } from "../services/video-workflow-planner.service.js";
import { mapVideoWorkflowPlanToResponse } from "../dto/video-workflow-plan.mapper.js";
import { ApiResponse } from "../utils/api-response.js";
import { PlanVideoWorkflowSchema } from "../validators/video-workflow-plan.validator.js";

const videoWorkflowPlannerService = new VideoWorkflowPlannerService();

// Zod-inline validation, matching ChatController exactly — this is a JSON
// body endpoint (not multipart), so express-validator's field-by-field
// style isn't the right fit here the way it is for video-source.validator.ts.
export class VideoWorkflowPlannerController {
  static async plan(req: Request, res: Response) {
    const parsed = PlanVideoWorkflowSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Validation error";
      return ApiResponse.error(res, message, 400);
    }

    const plan = await videoWorkflowPlannerService.plan(parsed.data, req.user.id);

    return ApiResponse.success(
      res,
      mapVideoWorkflowPlanToResponse(plan),
      201,
      "Workflow plan generated successfully."
    );
  }

  static async list(req: Request, res: Response) {
    const plans = await videoWorkflowPlannerService.list(
      req.query.projectId as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      plans.map(mapVideoWorkflowPlanToResponse),
      200,
      "Workflow plans retrieved successfully."
    );
  }
}

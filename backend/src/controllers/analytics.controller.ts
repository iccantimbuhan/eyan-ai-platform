import type { Request, Response } from "express";

import { AnalyticsService } from "../services/analytics.service.js";
import { ApiResponse } from "../utils/api-response.js";

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  static async getPlatformSummary(req: Request, res: Response) {
    const summary = await analyticsService.getPlatformSummary(req.user.id);

    return ApiResponse.success(res, summary, 200, "Analytics summary retrieved successfully.");
  }

  static async getProjectSummary(req: Request, res: Response) {
    const summary = await analyticsService.getProjectSummary(
      req.params.projectId as string,
      req.user.id
    );

    return ApiResponse.success(res, summary, 200, "Project analytics retrieved successfully.");
  }

  static async getProjectActivity(req: Request, res: Response) {
    const activity = await analyticsService.getProjectActivity(
      req.params.projectId as string,
      req.user.id,
      {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      }
    );

    return ApiResponse.success(res, activity, 200, "Project activity retrieved successfully.");
  }

  static async getPlatformActivity(req: Request, res: Response) {
    const activity = await analyticsService.getPlatformActivity(req.user.id, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    return ApiResponse.success(res, activity, 200, "Activity retrieved successfully.");
  }
}

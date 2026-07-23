import type { Request, Response } from "express";

import { ContentService } from "../services/content.service.js";
import { ApiResponse } from "../utils/api-response.js";

const contentService = new ContentService();

export class ContentController {
  static async generateContent(req: Request, res: Response) {
    const content = await contentService.generate(req.body, req.user?.id);

    return ApiResponse.success(
      res,
      content,
      201,
      "Content generated successfully."
    );
  }

  static async getContents(req: Request, res: Response) {
    const result = await contentService.list({
      projectId: req.query.projectId as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });

    return ApiResponse.paginated(
      res,
      result.items,
      result.pagination,
      200,
      "Generated content retrieved successfully."
    );
  }

  static async getContent(req: Request, res: Response) {
    const content = await contentService.getById(req.params.id as string);

    return ApiResponse.success(
      res,
      content,
      200,
      "Generated content retrieved successfully."
    );
  }

  static async deleteContent(req: Request, res: Response) {
    await contentService.delete(req.params.id as string);

    return ApiResponse.success(
      res,
      null,
      200,
      "Generated content deleted successfully."
    );
  }
}

import type { Request, Response } from "express";

import { ImageService } from "../services/image.service.js";
import { ApiResponse } from "../utils/api-response.js";

const imageService = new ImageService();

export class ImageController {
  static async getImages(req: Request, res: Response) {
    const result = await imageService.list(
      {
        projectId: req.query.projectId as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      },
      req.user.id
    );

    return ApiResponse.paginated(
      res,
      result.items,
      result.pagination,
      200,
      "Generated images retrieved successfully."
    );
  }

  static async getImage(req: Request, res: Response) {
    const image = await imageService.getById(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      image,
      200,
      "Generated image retrieved successfully."
    );
  }

  static async deleteImage(req: Request, res: Response) {
    await imageService.delete(req.params.id as string, req.user.id);

    return ApiResponse.success(
      res,
      null,
      200,
      "Generated image deleted successfully."
    );
  }
}

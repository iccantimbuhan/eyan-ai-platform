import type { Request, Response } from "express";

import { VideoAssetService } from "../services/video-asset.service.js";
import { mapVideoAssetToResponse } from "../dto/video-asset.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

const videoAssetService = new VideoAssetService();

export class VideoAssetController {
  static async generateVideoAsset(req: Request, res: Response) {
    const video = await videoAssetService.generate(req.body, req.user.id);

    return ApiResponse.success(
      res,
      mapVideoAssetToResponse(video),
      201,
      "Video asset generated successfully."
    );
  }

  static async getVideoAssets(req: Request, res: Response) {
    const result = await videoAssetService.list(
      {
        projectId: req.query.projectId as string,
        videoGroupId: req.query.videoGroupId as string | undefined,
        kind: req.query.kind as never,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      },
      req.user.id
    );

    return ApiResponse.paginated(
      res,
      result.items.map(mapVideoAssetToResponse),
      result.pagination,
      200,
      "Video assets retrieved successfully."
    );
  }

  static async getVideoAsset(req: Request, res: Response) {
    const video = await videoAssetService.getById(req.params.id as string, req.user.id);

    return ApiResponse.success(
      res,
      mapVideoAssetToResponse(video),
      200,
      "Video asset retrieved successfully."
    );
  }

  static async deleteVideoAsset(req: Request, res: Response) {
    await videoAssetService.delete(req.params.id as string, req.user.id);

    return ApiResponse.success(res, null, 200, "Video asset deleted successfully.");
  }
}

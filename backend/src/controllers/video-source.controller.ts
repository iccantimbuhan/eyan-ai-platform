import type { Request, Response } from "express";

import { VideoSourceService } from "../services/video-source.service.js";
import { mapVideoAssetToResponse } from "../dto/video-asset.mapper.js";
import { ApiResponse } from "../utils/api-response.js";
import { NoVideoFileProvidedError } from "../errors/video-source.error.js";

const videoSourceService = new VideoSourceService();

export class VideoSourceController {
  static async upload(req: Request, res: Response) {
    if (!req.file) {
      throw new NoVideoFileProvidedError();
    }

    const video = await videoSourceService.ingest(
      {
        projectId: req.body.projectId,
        videoGroupId: req.body.videoGroupId || undefined,
        tempFilePath: req.file.path,
        originalFileName: req.file.originalname,
      },
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapVideoAssetToResponse(video),
      201,
      "Video source uploaded successfully."
    );
  }
}

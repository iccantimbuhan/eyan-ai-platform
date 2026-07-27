import type { Request, Response } from "express";

import { BrandKitService } from "../services/brand-kit.service.js";
import { mapBrandKitToResponse } from "../dto/brand-kit.mapper.js";
import { ApiResponse } from "../utils/api-response.js";

const brandKitService = new BrandKitService();

export class BrandKitController {
  static async createBrandKit(req: Request, res: Response) {
    const brandKit = await brandKitService.create(req.body, req.user.id);

    return ApiResponse.success(
      res,
      mapBrandKitToResponse(brandKit),
      201,
      "Brand kit created successfully."
    );
  }

  static async getBrandKits(req: Request, res: Response) {
    const brandKits = await brandKitService.list(
      req.query.projectId as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      brandKits.map(mapBrandKitToResponse),
      200,
      "Brand kits retrieved successfully."
    );
  }

  static async getBrandKit(req: Request, res: Response) {
    const brandKit = await brandKitService.getById(
      req.params.id as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapBrandKitToResponse(brandKit),
      200,
      "Brand kit retrieved successfully."
    );
  }

  static async updateBrandKit(req: Request, res: Response) {
    const brandKit = await brandKitService.update(
      req.params.id as string,
      req.body,
      req.user.id
    );

    return ApiResponse.success(
      res,
      mapBrandKitToResponse(brandKit),
      200,
      "Brand kit updated successfully."
    );
  }

  static async deleteBrandKit(req: Request, res: Response) {
    await brandKitService.delete(req.params.id as string, req.user.id);

    return ApiResponse.success(res, null, 200, "Brand kit deleted successfully.");
  }
}

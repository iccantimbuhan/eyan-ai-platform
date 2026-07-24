import type { Request, Response } from "express";

import type { AssetType } from "../generated/prisma/enums.js";
import { AssetService } from "../services/asset.service.js";
import { ApiResponse } from "../utils/api-response.js";

const assetService = new AssetService();

export class AssetController {
  static async listAssets(req: Request, res: Response) {
    const result = await assetService.list(
      {
        projectId: req.query.projectId as string,
        type: req.query.type as AssetType | undefined,
        status: req.query.status as never,
        provider: req.query.provider as string | undefined,
        model: req.query.model as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        sortBy: req.query.sortBy as never,
        sortDir: req.query.sortDir as never,
      },
      req.user.id
    );

    return ApiResponse.paginated(
      res,
      result.items,
      result.pagination,
      200,
      "Assets retrieved successfully."
    );
  }

  static async getAsset(req: Request, res: Response) {
    const asset = await assetService.getDetail(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, asset, 200, "Asset retrieved successfully.");
  }

  static async reviewAsset(req: Request, res: Response) {
    const asset = await assetService.review(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.body,
      req.user.id,
      req.user.id
    );

    return ApiResponse.success(res, asset, 200, "Asset review updated successfully.");
  }

  static async regenerateAsset(req: Request, res: Response) {
    const asset = await assetService.regenerate(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, asset, 201, "Asset regenerated successfully.");
  }

  static async duplicateAsset(req: Request, res: Response) {
    const asset = await assetService.duplicate(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, asset, 201, "Asset duplicated successfully.");
  }

  static async deleteAsset(req: Request, res: Response) {
    await assetService.delete(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, null, 200, "Asset deleted successfully.");
  }

  static async getAssetVersions(req: Request, res: Response) {
    const versions = await assetService.listVersions(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(
      res,
      versions,
      200,
      "Asset version history retrieved successfully."
    );
  }

  static async batchAssetAction(req: Request, res: Response) {
    const results = await assetService.batch(req.body, req.user.id);

    return ApiResponse.success(res, results, 200, "Batch action completed.");
  }
}

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
        publishingStatus: req.query.publishingStatus as never,
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

  // --- Sprint 6.3 (Creative Review Workspace) -----------------------------

  static async listComments(req: Request, res: Response) {
    const comments = await assetService.listComments(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, comments, 200, "Comments retrieved successfully.");
  }

  static async addComment(req: Request, res: Response) {
    const comment = await assetService.addComment(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.body,
      req.user.id,
      req.user.id
    );

    return ApiResponse.success(res, comment, 201, "Comment added successfully.");
  }

  static async resolveComment(req: Request, res: Response) {
    const comment = await assetService.resolveComment(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.params.commentId as string,
      req.user.id
    );

    return ApiResponse.success(res, comment, 200, "Comment resolved successfully.");
  }

  static async deleteComment(req: Request, res: Response) {
    await assetService.deleteComment(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.params.commentId as string,
      req.user.id
    );

    return ApiResponse.success(res, null, 200, "Comment deleted successfully.");
  }

  static async assignReviewer(req: Request, res: Response) {
    const assignment = await assetService.assignReviewer(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.body,
      req.user.id,
      req.user.id
    );

    return ApiResponse.success(res, assignment, 200, "Reviewer assigned successfully.");
  }

  static async unassignReviewer(req: Request, res: Response) {
    await assetService.unassignReviewer(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, null, 200, "Reviewer unassigned successfully.");
  }

  static async getTimeline(req: Request, res: Response) {
    const events = await assetService.getTimeline(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, events, 200, "Timeline retrieved successfully.");
  }

  // --- Sprint 6.4 (Publishing Pipeline) -----------------------------------

  static async listPublishingRecords(req: Request, res: Response) {
    const records = await assetService.listPublishingRecords(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.user.id
    );

    return ApiResponse.success(res, records, 200, "Publishing records retrieved successfully.");
  }

  static async schedulePublish(req: Request, res: Response) {
    const record = await assetService.schedulePublish(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      { platform: req.params.platform as string, scheduledFor: req.body.scheduledFor },
      req.user.id
    );

    return ApiResponse.success(res, record, 200, "Publishing scheduled successfully.");
  }

  static async publishAsset(req: Request, res: Response) {
    const record = await assetService.publish(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.params.platform as string,
      req.user.id
    );

    return ApiResponse.success(res, record, 200, "Asset published successfully.");
  }

  static async retryPublish(req: Request, res: Response) {
    const record = await assetService.retryPublish(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.params.platform as string,
      req.user.id
    );

    return ApiResponse.success(res, record, 200, "Publishing retried successfully.");
  }

  static async archivePublish(req: Request, res: Response) {
    const record = await assetService.archivePublish(
      req.params.assetType as AssetType,
      req.params.sourceId as string,
      req.params.platform as string,
      req.user.id
    );

    return ApiResponse.success(res, record, 200, "Publishing record archived successfully.");
  }
}

import { Router, type Router as ExpressRouter } from "express";

import { AssetController } from "../../controllers/asset.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  assetParamValidator,
  assignReviewerValidator,
  batchAssetActionValidator,
  commentIdParamValidator,
  createCommentValidator,
  listAssetsValidator,
  platformParamValidator,
  reviewAssetValidator,
  schedulePublishValidator,
} from "../../validators/asset.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  listAssetsValidator,
  validate,
  AssetController.listAssets
);

router.post(
  "/batch",
  authenticate,
  batchAssetActionValidator,
  validate,
  AssetController.batchAssetAction
);

router.get(
  "/:assetType/:sourceId",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.getAsset
);

router.get(
  "/:assetType/:sourceId/versions",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.getAssetVersions
);

router.patch(
  "/:assetType/:sourceId/review",
  authenticate,
  assetParamValidator,
  reviewAssetValidator,
  validate,
  AssetController.reviewAsset
);

router.post(
  "/:assetType/:sourceId/regenerate",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.regenerateAsset
);

router.post(
  "/:assetType/:sourceId/duplicate",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.duplicateAsset
);

router.delete(
  "/:assetType/:sourceId",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.deleteAsset
);

// --- Sprint 6.3 (Creative Review Workspace) --------------------------------

router.get(
  "/:assetType/:sourceId/comments",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.listComments
);

router.post(
  "/:assetType/:sourceId/comments",
  authenticate,
  assetParamValidator,
  createCommentValidator,
  validate,
  AssetController.addComment
);

router.patch(
  "/:assetType/:sourceId/comments/:commentId/resolve",
  authenticate,
  commentIdParamValidator,
  validate,
  AssetController.resolveComment
);

router.delete(
  "/:assetType/:sourceId/comments/:commentId",
  authenticate,
  commentIdParamValidator,
  validate,
  AssetController.deleteComment
);

router.put(
  "/:assetType/:sourceId/assignment",
  authenticate,
  assetParamValidator,
  assignReviewerValidator,
  validate,
  AssetController.assignReviewer
);

router.delete(
  "/:assetType/:sourceId/assignment",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.unassignReviewer
);

router.get(
  "/:assetType/:sourceId/timeline",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.getTimeline
);

// --- Sprint 6.4 (Publishing Pipeline) ---------------------------------------

router.get(
  "/:assetType/:sourceId/publishing",
  authenticate,
  assetParamValidator,
  validate,
  AssetController.listPublishingRecords
);

router.put(
  "/:assetType/:sourceId/publishing/:platform",
  authenticate,
  schedulePublishValidator,
  validate,
  AssetController.schedulePublish
);

router.post(
  "/:assetType/:sourceId/publishing/:platform/publish",
  authenticate,
  platformParamValidator,
  validate,
  AssetController.publishAsset
);

router.post(
  "/:assetType/:sourceId/publishing/:platform/retry",
  authenticate,
  platformParamValidator,
  validate,
  AssetController.retryPublish
);

router.delete(
  "/:assetType/:sourceId/publishing/:platform",
  authenticate,
  platformParamValidator,
  validate,
  AssetController.archivePublish
);

export default router;

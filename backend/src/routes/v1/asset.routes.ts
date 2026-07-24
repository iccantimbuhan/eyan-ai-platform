import { Router, type Router as ExpressRouter } from "express";

import { AssetController } from "../../controllers/asset.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  assetParamValidator,
  batchAssetActionValidator,
  listAssetsValidator,
  reviewAssetValidator,
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

export default router;

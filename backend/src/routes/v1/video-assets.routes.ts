import { Router, type Router as ExpressRouter } from "express";

import { VideoAssetController } from "../../controllers/video-asset.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  generateVideoAssetValidator,
  listVideoAssetsValidator,
  videoAssetIdParamValidator,
} from "../../validators/video-asset.validator.js";

const router: ExpressRouter = Router();

router.post(
  "/generate",
  authenticate,
  generateVideoAssetValidator,
  validate,
  VideoAssetController.generateVideoAsset
);

router.get(
  "/",
  authenticate,
  listVideoAssetsValidator,
  validate,
  VideoAssetController.getVideoAssets
);

router.get(
  "/:id",
  authenticate,
  videoAssetIdParamValidator,
  validate,
  VideoAssetController.getVideoAsset
);

router.delete(
  "/:id",
  authenticate,
  videoAssetIdParamValidator,
  validate,
  VideoAssetController.deleteVideoAsset
);

export default router;

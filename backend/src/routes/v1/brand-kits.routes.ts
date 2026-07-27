import { Router, type Router as ExpressRouter } from "express";

import { BrandKitController } from "../../controllers/brand-kit.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  brandKitIdParamValidator,
  createBrandKitValidator,
  listBrandKitsValidator,
  updateBrandKitValidator,
} from "../../validators/brand-kit.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  listBrandKitsValidator,
  validate,
  BrandKitController.getBrandKits
);

router.get(
  "/:id",
  authenticate,
  brandKitIdParamValidator,
  validate,
  BrandKitController.getBrandKit
);

router.post(
  "/",
  authenticate,
  createBrandKitValidator,
  validate,
  BrandKitController.createBrandKit
);

router.patch(
  "/:id",
  authenticate,
  brandKitIdParamValidator,
  updateBrandKitValidator,
  validate,
  BrandKitController.updateBrandKit
);

router.delete(
  "/:id",
  authenticate,
  brandKitIdParamValidator,
  validate,
  BrandKitController.deleteBrandKit
);

export default router;

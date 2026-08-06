import { Router, type Router as ExpressRouter } from "express";

import { MenuCategoryController } from "../../controllers/menu-category.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireMenuCategoryAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  categoryIdParamValidator,
  updateMenuCategoryValidator,
} from "../../validators/menu-category.validator.js";

// Mounted at /api/v1/menu-categories — single-category operations by its
// own id. Creating/listing categories happens under a Restaurant instead,
// see restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:categoryId",
  categoryIdParamValidator,
  validate,
  requireMenuCategoryAccess(),
  MenuCategoryController.getOne
);

router.patch(
  "/:categoryId",
  categoryIdParamValidator,
  updateMenuCategoryValidator,
  validate,
  requireMenuCategoryAccess(),
  MenuCategoryController.update
);

router.delete(
  "/:categoryId",
  categoryIdParamValidator,
  validate,
  requireMenuCategoryAccess(),
  MenuCategoryController.remove
);

export default router;

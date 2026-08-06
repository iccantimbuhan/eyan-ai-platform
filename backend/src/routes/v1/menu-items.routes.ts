import { Router, type Router as ExpressRouter } from "express";

import { MenuItemController } from "../../controllers/menu-item.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireMenuItemAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  itemIdParamValidator,
  updateMenuItemValidator,
} from "../../validators/menu-item.validator.js";

// Mounted at /api/v1/menu-items — single-item operations by its own id.
// Creating/listing items happens under a Restaurant instead, see
// restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:itemId",
  itemIdParamValidator,
  validate,
  requireMenuItemAccess(),
  MenuItemController.getOne
);

router.patch(
  "/:itemId",
  itemIdParamValidator,
  updateMenuItemValidator,
  validate,
  requireMenuItemAccess(),
  MenuItemController.update
);

router.delete(
  "/:itemId",
  itemIdParamValidator,
  validate,
  requireMenuItemAccess(),
  MenuItemController.remove
);

export default router;

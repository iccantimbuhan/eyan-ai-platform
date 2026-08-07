import { Router, type Router as ExpressRouter } from "express";

import { MenuItemController } from "../../controllers/menu-item.controller.js";
import { SalesChannelMenuItemController } from "../../controllers/sales-channel-menu-item.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireMenuItemAccess, requireTenantRole } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  itemIdParamValidator,
  updateMenuItemValidator,
} from "../../validators/menu-item.validator.js";
import {
  salesChannelIdParamValidator,
  upsertSalesChannelMenuItemValidator,
} from "../../validators/sales-channel-menu-item.validator.js";

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

// Sprint 2B Prep — one optional channel-specific price/availability
// override per (menuItem, salesChannel) pair. Financial/pricing reference
// data, same write-role posture as Sprint 2C's Sales reference lists
// (ADR-0039) rather than the unrestricted-to-any-member writes Menu Item's
// own fields use.
const CHANNEL_PRICE_WRITE_ROLES = ["OWNER", "MANAGER", "SUPERVISOR", "ACCOUNTANT"] as const;

router.put(
  "/:itemId/channel-prices/:salesChannelId",
  itemIdParamValidator,
  salesChannelIdParamValidator,
  upsertSalesChannelMenuItemValidator,
  validate,
  requireMenuItemAccess(),
  requireTenantRole(...CHANNEL_PRICE_WRITE_ROLES),
  SalesChannelMenuItemController.upsert
);

router.delete(
  "/:itemId/channel-prices/:salesChannelId",
  itemIdParamValidator,
  salesChannelIdParamValidator,
  validate,
  requireMenuItemAccess(),
  requireTenantRole(...CHANNEL_PRICE_WRITE_ROLES),
  SalesChannelMenuItemController.remove
);

export default router;

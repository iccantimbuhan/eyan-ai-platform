import { Router, type Router as ExpressRouter } from "express";

import { InventoryItemController } from "../../controllers/inventory-item.controller.js";
import { StockMovementController } from "../../controllers/stock-movement.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireInventoryItemAccess, requireTenantRole } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  inventoryItemIdParamValidator,
  updateInventoryItemValidator,
} from "../../validators/inventory-item.validator.js";
import {
  createAdjustmentValidator,
  createStockCountValidator,
  createWasteValidator,
} from "../../validators/stock-movement.validator.js";

// Mounted at /api/v1/inventory-items — single-inventory-item operations by
// its own id, plus its movement history and the three write actions
// (adjustment/waste/stock count). Creating/listing InventoryItems
// themselves happens under a Branch instead, see branches.routes.ts.
// requireInventoryItemAccess is Branch-scoped (Branch->Restaurant->
// Organization), not Restaurant-scoped — see tenant.middleware.ts and
// ADR-0038.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:inventoryItemId",
  inventoryItemIdParamValidator,
  validate,
  requireInventoryItemAccess(),
  InventoryItemController.getOne
);

router.patch(
  "/:inventoryItemId",
  inventoryItemIdParamValidator,
  updateInventoryItemValidator,
  validate,
  requireInventoryItemAccess(),
  requireTenantRole("OWNER", "MANAGER", "SUPERVISOR", "INVENTORY_STAFF"),
  InventoryItemController.update
);

router.get(
  "/:inventoryItemId/movements",
  inventoryItemIdParamValidator,
  validate,
  requireInventoryItemAccess(),
  StockMovementController.list
);

router.post(
  "/:inventoryItemId/adjustments",
  inventoryItemIdParamValidator,
  createAdjustmentValidator,
  validate,
  requireInventoryItemAccess(),
  requireTenantRole("OWNER", "MANAGER", "SUPERVISOR", "INVENTORY_STAFF"),
  StockMovementController.createAdjustment
);

router.post(
  "/:inventoryItemId/waste",
  inventoryItemIdParamValidator,
  createWasteValidator,
  validate,
  requireInventoryItemAccess(),
  requireTenantRole("OWNER", "MANAGER", "SUPERVISOR", "INVENTORY_STAFF"),
  StockMovementController.createWaste
);

router.post(
  "/:inventoryItemId/stock-count",
  inventoryItemIdParamValidator,
  createStockCountValidator,
  validate,
  requireInventoryItemAccess(),
  requireTenantRole("OWNER", "MANAGER", "SUPERVISOR", "INVENTORY_STAFF"),
  StockMovementController.createStockCount
);

export default router;

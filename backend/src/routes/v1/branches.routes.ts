import { Router, type Router as ExpressRouter } from "express";

import { BranchController } from "../../controllers/branch.controller.js";
import { InventoryItemController } from "../../controllers/inventory-item.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireBranchAccess, requireTenantRole } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  branchIdParamValidator,
  updateBranchValidator,
} from "../../validators/branch.validator.js";
import {
  branchIdParamValidator as inventoryBranchIdParamValidator,
  createInventoryItemValidator,
} from "../../validators/inventory-item.validator.js";

// Mounted at /api/v1/branches — single-Branch operations by its own id.
// Creating/listing Branches happens under a Restaurant instead, see
// restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:branchId",
  branchIdParamValidator,
  validate,
  requireBranchAccess(),
  BranchController.getOne
);

router.patch(
  "/:branchId",
  branchIdParamValidator,
  updateBranchValidator,
  validate,
  requireBranchAccess(),
  BranchController.update
);

router.delete(
  "/:branchId",
  branchIdParamValidator,
  validate,
  requireBranchAccess(),
  BranchController.remove
);

// Inventory Foundation (Sprint 2A, ADR-0038) — InventoryItem create/list
// live nested under Branch, mirroring restaurants.routes.ts holding
// Ingredient/Recipe create/list. Reads are open to any branch role;
// writes (opening stock is a create) are restricted to the roles
// confirmed capable of managing stock — see ADR-0038.
router.get(
  "/:branchId/inventory-items",
  inventoryBranchIdParamValidator,
  validate,
  requireBranchAccess(),
  InventoryItemController.list
);

router.post(
  "/:branchId/inventory-items",
  inventoryBranchIdParamValidator,
  createInventoryItemValidator,
  validate,
  requireBranchAccess(),
  requireTenantRole("OWNER", "MANAGER", "SUPERVISOR", "INVENTORY_STAFF"),
  InventoryItemController.create
);

export default router;

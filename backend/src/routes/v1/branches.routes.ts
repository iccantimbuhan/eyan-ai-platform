import { Router, type Router as ExpressRouter } from "express";

import { BranchController } from "../../controllers/branch.controller.js";
import { InventoryItemController } from "../../controllers/inventory-item.controller.js";
import { DailySalesRecordController } from "../../controllers/daily-sales-record.controller.js";
import { SalesAggregationController } from "../../controllers/sales-aggregation.controller.js";

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
import {
  comparisonQueryValidator,
  createDailySalesRecordValidator,
  dailyQueryValidator,
  weeklyQueryValidator,
} from "../../validators/daily-sales-record.validator.js";

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

// Sales Foundation (Sprint 2C, ADR-0039) — DailySalesRecord create/list
// live nested under Branch, mirroring Inventory Item above. Daily/weekly
// retrieval are also nested here (literal /daily and /weekly segments,
// never colliding with a bare "/:branchId/sales" or an ":id"-shaped
// segment, since no such segment is registered under this path — same
// reasoning Inventory already relies on). Reads are open to any branch
// role; writes require the roles confirmed for Sales — see ADR-0039.
const SALES_WRITE_ROLES = ["OWNER", "MANAGER", "SUPERVISOR", "ACCOUNTANT"] as const;

router.get(
  "/:branchId/sales",
  branchIdParamValidator,
  validate,
  requireBranchAccess(),
  DailySalesRecordController.list
);

router.post(
  "/:branchId/sales",
  branchIdParamValidator,
  createDailySalesRecordValidator,
  validate,
  requireBranchAccess(),
  requireTenantRole(...SALES_WRITE_ROLES),
  DailySalesRecordController.create
);

router.get(
  "/:branchId/sales/daily",
  branchIdParamValidator,
  dailyQueryValidator,
  validate,
  requireBranchAccess(),
  DailySalesRecordController.getDaily
);

router.get(
  "/:branchId/sales/weekly",
  branchIdParamValidator,
  weeklyQueryValidator,
  validate,
  requireBranchAccess(),
  SalesAggregationController.getWeekly
);

// Sprint 2D (Reporting & Analytics Foundation) — both periods are supplied
// explicitly by the caller (currentStart/EndDate + previousStart/EndDate);
// the backend never infers "the previous period" itself.
router.get(
  "/:branchId/sales/comparison",
  branchIdParamValidator,
  comparisonQueryValidator,
  validate,
  requireBranchAccess(),
  SalesAggregationController.getComparison
);

export default router;

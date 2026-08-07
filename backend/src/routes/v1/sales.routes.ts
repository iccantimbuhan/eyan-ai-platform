import { Router, type Router as ExpressRouter } from "express";

import { DailySalesRecordController } from "../../controllers/daily-sales-record.controller.js";
import {
  SalesCategoryEntryController,
  SalesChannelEntryController,
  SalesItemEntryController,
  SalesPaymentMethodEntryController,
} from "../../controllers/sales-entry.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireSalesRecordAccess, requireTenantRole } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  salesIdParamValidator,
  updateDailySalesRecordValidator,
} from "../../validators/daily-sales-record.validator.js";
import {
  createCategoryEntryValidator,
  createChannelEntryValidator,
  createItemEntryValidator,
  createPaymentMethodEntryValidator,
  entryIdParamValidator,
} from "../../validators/sales-entry.validator.js";

// Mounted at /api/v1/sales — single-sales-record operations by its own id,
// plus create/delete of its four line-entry types (channel/payment-method/
// category/item), each individually addressable and nested under the
// record's own id, mirroring RecipeIngredient's individual-line-CRUD shape
// but simplified (no PATCH — a line is deleted and re-added rather than
// edited in place; no separate flat route file per entry type, since
// entries have no standalone id-based addressability need the way
// RecipeIngredient's do). Creating/listing DailySalesRecords themselves,
// plus daily/weekly retrieval, happens under a Branch instead — see
// branches.routes.ts. requireSalesRecordAccess is Branch-scoped
// (Branch->Restaurant->Organization), reusing the same
// createBranchScopedAccessGuard factory requireInventoryItemAccess uses —
// see tenant.middleware.ts and ADR-0039.
const router: ExpressRouter = Router();
const WRITE_ROLES = ["OWNER", "MANAGER", "SUPERVISOR", "ACCOUNTANT"] as const;

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:salesId",
  salesIdParamValidator,
  validate,
  requireSalesRecordAccess(),
  DailySalesRecordController.getOne
);

router.patch(
  "/:salesId",
  salesIdParamValidator,
  updateDailySalesRecordValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  DailySalesRecordController.update
);

router.post(
  "/:salesId/channel-entries",
  salesIdParamValidator,
  createChannelEntryValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesChannelEntryController.create
);

router.delete(
  "/:salesId/channel-entries/:entryId",
  salesIdParamValidator,
  entryIdParamValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesChannelEntryController.remove
);

router.post(
  "/:salesId/payment-method-entries",
  salesIdParamValidator,
  createPaymentMethodEntryValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesPaymentMethodEntryController.create
);

router.delete(
  "/:salesId/payment-method-entries/:entryId",
  salesIdParamValidator,
  entryIdParamValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesPaymentMethodEntryController.remove
);

router.post(
  "/:salesId/category-entries",
  salesIdParamValidator,
  createCategoryEntryValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesCategoryEntryController.create
);

router.delete(
  "/:salesId/category-entries/:entryId",
  salesIdParamValidator,
  entryIdParamValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesCategoryEntryController.remove
);

router.post(
  "/:salesId/item-entries",
  salesIdParamValidator,
  createItemEntryValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesItemEntryController.create
);

router.delete(
  "/:salesId/item-entries/:entryId",
  salesIdParamValidator,
  entryIdParamValidator,
  validate,
  requireSalesRecordAccess(),
  requireTenantRole(...WRITE_ROLES),
  SalesItemEntryController.remove
);

export default router;

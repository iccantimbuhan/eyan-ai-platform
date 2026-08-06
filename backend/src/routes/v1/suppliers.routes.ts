import { Router, type Router as ExpressRouter } from "express";

import { SupplierController } from "../../controllers/supplier.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireSupplierAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  supplierIdParamValidator,
  updateSupplierValidator,
} from "../../validators/supplier.validator.js";

// Mounted at /api/v1/suppliers — single-supplier operations by its own id.
// Creating/listing suppliers happens under a Restaurant instead, see
// restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:supplierId",
  supplierIdParamValidator,
  validate,
  requireSupplierAccess(),
  SupplierController.getOne
);

router.patch(
  "/:supplierId",
  supplierIdParamValidator,
  updateSupplierValidator,
  validate,
  requireSupplierAccess(),
  SupplierController.update
);

router.delete(
  "/:supplierId",
  supplierIdParamValidator,
  validate,
  requireSupplierAccess(),
  SupplierController.remove
);

export default router;

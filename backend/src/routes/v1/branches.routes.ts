import { Router, type Router as ExpressRouter } from "express";

import { BranchController } from "../../controllers/branch.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireBranchAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  branchIdParamValidator,
  updateBranchValidator,
} from "../../validators/branch.validator.js";

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

export default router;

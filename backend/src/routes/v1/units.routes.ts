import { Router, type Router as ExpressRouter } from "express";

import { UnitController } from "../../controllers/unit.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireUnitAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import { unitIdParamValidator, updateUnitValidator } from "../../validators/unit.validator.js";

// Mounted at /api/v1/units — single-unit operations by its own id.
// Creating/listing units happens under a Restaurant instead, see
// restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get("/:unitId", unitIdParamValidator, validate, requireUnitAccess(), UnitController.getOne);

router.patch(
  "/:unitId",
  unitIdParamValidator,
  updateUnitValidator,
  validate,
  requireUnitAccess(),
  UnitController.update
);

router.delete(
  "/:unitId",
  unitIdParamValidator,
  validate,
  requireUnitAccess(),
  UnitController.remove
);

export default router;

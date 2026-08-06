import { Router, type Router as ExpressRouter } from "express";

import { RestaurantController } from "../../controllers/restaurant.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireOrganizationAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createRestaurantValidator,
  organizationIdParamValidator,
} from "../../validators/restaurant.validator.js";

// Mounted at /api/v1/organizations/:organizationId/restaurants with
// mergeParams so requireOrganizationAccess can read :organizationId — the
// one Restaurant operation that needs Organization-level access rather
// than Restaurant-level (creating/listing Restaurants under an
// Organization). See tenant.middleware.ts, .context/restaurant.md.
const router: ExpressRouter = Router({ mergeParams: true });

router.use(
  authenticate,
  requirePermission("restaurant"),
  organizationIdParamValidator,
  validate,
  requireOrganizationAccess()
);

router.get("/", RestaurantController.list);

router.post("/", createRestaurantValidator, validate, RestaurantController.create);

export default router;

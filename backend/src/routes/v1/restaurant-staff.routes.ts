import { Router, type Router as ExpressRouter } from "express";

import { StaffMembershipController } from "../../controllers/staff-membership.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireRestaurantAccess, requireTenantRole } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import { restaurantIdParamValidator } from "../../validators/restaurant.validator.js";
import {
  upsertStaffMembershipForRestaurantValidator,
  userIdParamValidator,
} from "../../validators/staff-membership.validator.js";

// Mounted at /api/v1/restaurants/:restaurantId/staff, mergeParams so
// requireRestaurantAccess can read :restaurantId. Lets a Restaurant-scoped
// Manager (RestaurantMember only, no OrganizationMember) manage their own
// restaurant's staff without needing Organization-level access — the
// organization-scoped route alone would lock them out entirely.
const router: ExpressRouter = Router({ mergeParams: true });

router.use(
  authenticate,
  requirePermission("restaurant"),
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  requireTenantRole("OWNER", "MANAGER")
);

router.get("/", StaffMembershipController.listForRestaurant);

router.post(
  "/",
  upsertStaffMembershipForRestaurantValidator,
  validate,
  StaffMembershipController.upsertForRestaurant
);

router.delete(
  "/:userId",
  userIdParamValidator,
  validate,
  StaffMembershipController.revokeFromRestaurant
);

export default router;

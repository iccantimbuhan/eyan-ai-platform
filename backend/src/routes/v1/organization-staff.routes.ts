import { Router, type Router as ExpressRouter } from "express";

import { StaffMembershipController } from "../../controllers/staff-membership.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireOrganizationAccess, requireTenantRole } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import { organizationIdParamValidator } from "../../validators/restaurant.validator.js";
import {
  upsertStaffMembershipValidator,
  userIdParamValidator,
} from "../../validators/staff-membership.validator.js";

// Mounted at /api/v1/organizations/:organizationId/staff, mergeParams so
// requireOrganizationAccess can read :organizationId. Only OWNER/MANAGER
// may manage staff — the first real usage of requireTenantRole (ADR-0036).
const router: ExpressRouter = Router({ mergeParams: true });

router.use(
  authenticate,
  requirePermission("restaurant"),
  organizationIdParamValidator,
  validate,
  requireOrganizationAccess(),
  requireTenantRole("OWNER", "MANAGER")
);

router.get("/", StaffMembershipController.listForOrganization);

router.post(
  "/",
  upsertStaffMembershipValidator,
  validate,
  StaffMembershipController.upsertForOrganization
);

router.delete(
  "/:userId",
  userIdParamValidator,
  validate,
  StaffMembershipController.revokeFromOrganization
);

export default router;

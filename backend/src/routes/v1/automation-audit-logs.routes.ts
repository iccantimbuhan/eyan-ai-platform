import { Router, type Router as ExpressRouter } from "express";

import { AutomationAuditLogController } from "../../controllers/automation-audit-log.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  connectionAuditLogParamValidator,
  listAuditLogsValidator,
} from "../../validators/automation-audit-log.validator.js";

const router: ExpressRouter = Router();

// Reuses the existing, previously-unused "auditlogs" permission (seeded
// since before this sprint for exactly this purpose — "View audit logs" —
// but never wired to a route until now) rather than introducing new
// permission surface for a concept the RBAC model already named.
router.get(
  "/",
  authenticate,
  requirePermission("auditlogs"),
  listAuditLogsValidator,
  validate,
  AutomationAuditLogController.getRecentAuditLogs
);

router.get(
  "/connections/:connectionId",
  authenticate,
  requirePermission("auditlogs"),
  connectionAuditLogParamValidator,
  listAuditLogsValidator,
  validate,
  AutomationAuditLogController.getConnectionAuditLogs
);

export default router;

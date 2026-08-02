import { Router, type Router as ExpressRouter } from "express";

import { CrmLeadController } from "../../controllers/crm-lead.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { publicLeadIntakeRateLimiter } from "../../middleware/rate-limit.middleware.js";

import {
  assignLeadValidator,
  createLeadNoteValidator,
  createLeadValidator,
  leadIdParamValidator,
  listLeadsValidator,
  updateLeadStatusValidator,
  updateLeadValidator,
} from "../../validators/crm-lead.validator.js";

const router: ExpressRouter = Router();

// Public — the Lead Form's submission target. No auth by design; rate
// limiting + validation are the perimeter (TDD §17).
router.post(
  "/",
  publicLeadIntakeRateLimiter,
  createLeadValidator,
  validate,
  CrmLeadController.create
);

// Everything else is the internal CRM surface, gated by the "crm"
// permission — same shared-workspace posture as Finance.
router.get(
  "/",
  authenticate,
  requirePermission("crm"),
  listLeadsValidator,
  validate,
  CrmLeadController.list
);

router.get(
  "/:id",
  authenticate,
  requirePermission("crm"),
  leadIdParamValidator,
  validate,
  CrmLeadController.getOne
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("crm"),
  leadIdParamValidator,
  updateLeadValidator,
  validate,
  CrmLeadController.update
);

router.patch(
  "/:id/status",
  authenticate,
  requirePermission("crm"),
  leadIdParamValidator,
  updateLeadStatusValidator,
  validate,
  CrmLeadController.updateStatus
);

router.patch(
  "/:id/assign",
  authenticate,
  requirePermission("crm"),
  leadIdParamValidator,
  assignLeadValidator,
  validate,
  CrmLeadController.assign
);

router.post(
  "/:id/notes",
  authenticate,
  requirePermission("crm"),
  leadIdParamValidator,
  createLeadNoteValidator,
  validate,
  CrmLeadController.addNote
);

// Phase 7 (Manual Review Queue, Sprint 5) — "Re-run AI Qualification".
router.post(
  "/:id/qualification/rerun",
  authenticate,
  requirePermission("crm"),
  leadIdParamValidator,
  validate,
  CrmLeadController.rerunQualification
);

export default router;

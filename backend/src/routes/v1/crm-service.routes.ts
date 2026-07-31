import { Router, type Router as ExpressRouter } from "express";

import { CrmAutomationController } from "../../controllers/crm-automation.controller.js";

import { authenticateService } from "../../middleware/service-auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  applyQualificationResultValidator,
  applyValidationResultValidator,
  dedupeLeadQueryValidator,
  leadIdParamValidator,
} from "../../validators/crm-automation.validator.js";

// n8n-facing surface (TDD §9/§11) — every route here is
// authenticateService-gated, never authenticate/requirePermission. No
// AutomationConnection/user identity is involved; this is a single shared
// service secret (ADR-0019 Decision 2).
const router: ExpressRouter = Router();

router.use(authenticateService);

router.get("/leads", dedupeLeadQueryValidator, validate, CrmAutomationController.findByEmail);

router.patch(
  "/leads/:id/validation",
  leadIdParamValidator,
  applyValidationResultValidator,
  validate,
  CrmAutomationController.applyValidationResult
);

router.patch(
  "/leads/:id/qualification",
  leadIdParamValidator,
  applyQualificationResultValidator,
  validate,
  CrmAutomationController.applyQualificationResult
);

export default router;

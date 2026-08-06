import { Router, type Router as ExpressRouter } from "express";

import { PromptTemplateController } from "../../controllers/prompt-template.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import { listPromptTemplatesValidator } from "../../validators/prompt-template.validator.js";

const router: ExpressRouter = Router();

// Content Studio's platform permission is "dashboard" — see
// backend/src/config/module-registry.ts (Sprint 1.3.1).
router.use(authenticate, requirePermission("dashboard"));

router.get(
  "/",
  listPromptTemplatesValidator,
  validate,
  PromptTemplateController.getTemplates
);

export default router;

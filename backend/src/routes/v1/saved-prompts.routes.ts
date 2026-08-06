import { Router, type Router as ExpressRouter } from "express";

import { SavedPromptController } from "../../controllers/saved-prompt.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createSavedPromptValidator,
  updateSavedPromptValidator,
  savedPromptIdParamValidator,
} from "../../validators/saved-prompt.validator.js";

const router: ExpressRouter = Router();

// Content Studio's platform permission is "dashboard" — see
// backend/src/config/module-registry.ts (Sprint 1.3.1).
router.use(authenticate, requirePermission("dashboard"));

router.get(
  "/",
  SavedPromptController.getSavedPrompts
);

router.get(
  "/:id",
  savedPromptIdParamValidator,
  validate,
  SavedPromptController.getSavedPrompt
);

router.post(
  "/",
  createSavedPromptValidator,
  validate,
  SavedPromptController.createSavedPrompt
);

router.patch(
  "/:id",
  savedPromptIdParamValidator,
  updateSavedPromptValidator,
  validate,
  SavedPromptController.updateSavedPrompt
);

router.delete(
  "/:id",
  savedPromptIdParamValidator,
  validate,
  SavedPromptController.deleteSavedPrompt
);

export default router;

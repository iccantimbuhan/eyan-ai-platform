import { Router, type Router as ExpressRouter } from "express";

import { SavedPromptController } from "../../controllers/saved-prompt.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  createSavedPromptValidator,
  updateSavedPromptValidator,
  savedPromptIdParamValidator,
} from "../../validators/saved-prompt.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  SavedPromptController.getSavedPrompts
);

router.get(
  "/:id",
  authenticate,
  savedPromptIdParamValidator,
  validate,
  SavedPromptController.getSavedPrompt
);

router.post(
  "/",
  authenticate,
  createSavedPromptValidator,
  validate,
  SavedPromptController.createSavedPrompt
);

router.patch(
  "/:id",
  authenticate,
  savedPromptIdParamValidator,
  updateSavedPromptValidator,
  validate,
  SavedPromptController.updateSavedPrompt
);

router.delete(
  "/:id",
  authenticate,
  savedPromptIdParamValidator,
  validate,
  SavedPromptController.deleteSavedPrompt
);

export default router;

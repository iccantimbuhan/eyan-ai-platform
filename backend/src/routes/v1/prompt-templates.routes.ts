import { Router, type Router as ExpressRouter } from "express";

import { PromptTemplateController } from "../../controllers/prompt-template.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import { listPromptTemplatesValidator } from "../../validators/prompt-template.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  listPromptTemplatesValidator,
  validate,
  PromptTemplateController.getTemplates
);

export default router;

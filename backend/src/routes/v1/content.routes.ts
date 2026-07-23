import { Router, type Router as ExpressRouter } from "express";

import { ContentController } from "../../controllers/content.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  generateContentValidator,
  contentIdParamValidator,
  listContentValidator,
} from "../../validators/content.validator.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  listContentValidator,
  validate,
  ContentController.getContents
);

router.get(
  "/:id",
  authenticate,
  contentIdParamValidator,
  validate,
  ContentController.getContent
);

router.post(
  "/generate",
  authenticate,
  generateContentValidator,
  validate,
  ContentController.generateContent
);

router.delete(
  "/:id",
  authenticate,
  contentIdParamValidator,
  validate,
  ContentController.deleteContent
);

export default router;

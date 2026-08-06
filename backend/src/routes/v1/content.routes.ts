import { Router, type Router as ExpressRouter } from "express";

import { ContentController } from "../../controllers/content.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  generateContentValidator,
  contentIdParamValidator,
  listContentValidator,
} from "../../validators/content.validator.js";

const router: ExpressRouter = Router();

// Content Studio's platform permission is "dashboard" — see
// backend/src/config/module-registry.ts's Module Registry entry, the same
// permission the frontend's sidebar/route guards reuse (Sprint 1.3.1).
router.use(authenticate, requirePermission("dashboard"));

router.get(
  "/",
  listContentValidator,
  validate,
  ContentController.getContents
);

router.get(
  "/:id",
  contentIdParamValidator,
  validate,
  ContentController.getContent
);

router.post(
  "/generate",
  generateContentValidator,
  validate,
  ContentController.generateContent
);

router.delete(
  "/:id",
  contentIdParamValidator,
  validate,
  ContentController.deleteContent
);

export default router;

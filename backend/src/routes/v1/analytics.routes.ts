import { Router, type Router as ExpressRouter } from "express";

import { AnalyticsController } from "../../controllers/analytics.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  activityQueryValidator,
  platformActivityQueryValidator,
  projectIdParamValidator,
} from "../../validators/analytics.validator.js";

const router: ExpressRouter = Router();

// authenticate-only, ownership-checked the same way every other project-
// scoped endpoint already is — analytics-about-your-own-projects is the
// same category as everything else in Content Studio. See ADR-0011.
router.get("/summary", authenticate, AnalyticsController.getPlatformSummary);

router.get(
  "/activity",
  authenticate,
  platformActivityQueryValidator,
  validate,
  AnalyticsController.getPlatformActivity
);

router.get(
  "/projects/:projectId/summary",
  authenticate,
  projectIdParamValidator,
  validate,
  AnalyticsController.getProjectSummary
);

router.get(
  "/projects/:projectId/activity",
  authenticate,
  activityQueryValidator,
  validate,
  AnalyticsController.getProjectActivity
);

export default router;

import { Router, type Router as ExpressRouter } from "express";

import { VideoWorkflowPlannerController } from "../../controllers/video-workflow-planner.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { listVideoWorkflowPlansValidator } from "../../validators/video-workflow-plan.validator.js";

const router: ExpressRouter = Router();

router.post("/", authenticate, VideoWorkflowPlannerController.plan);

router.get(
  "/",
  authenticate,
  listVideoWorkflowPlansValidator,
  validate,
  VideoWorkflowPlannerController.list
);

export default router;

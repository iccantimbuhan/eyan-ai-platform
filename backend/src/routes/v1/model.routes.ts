import { Router, type Router as ExpressRouter } from "express";

import { ModelController } from "../../controllers/model.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router: ExpressRouter = Router();

router.get(
  "/",
  authenticate,
  requirePermission("models.read"),
  ModelController.getModels
);

export default router;

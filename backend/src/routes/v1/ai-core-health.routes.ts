import { Router, type Router as ExpressRouter } from "express";

import { AiHealthController } from "../../controllers/ai-health.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router: ExpressRouter = Router();

router.get("/", authenticate, requirePermission("aicore"), AiHealthController.overview);

export default router;

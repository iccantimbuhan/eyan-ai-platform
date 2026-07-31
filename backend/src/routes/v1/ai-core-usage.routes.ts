import { Router, type Router as ExpressRouter } from "express";

import { AiUsageController } from "../../controllers/ai-usage.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router: ExpressRouter = Router();

router.get("/usage", authenticate, requirePermission("aicore"), AiUsageController.list);
router.get("/costs", authenticate, requirePermission("aicore"), AiUsageController.costSummary);

export default router;

import { Router, type Router as ExpressRouter } from "express";

import { AiPlaygroundController } from "../../controllers/ai-playground.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { invokeAiPlaygroundValidator } from "../../validators/ai-playground.validator.js";

const router: ExpressRouter = Router();

// "aicoreadmin" — an override can bypass a production Routing Policy for
// that one call, the same permission tier as editing one directly (§6, §13).
router.post(
  "/invoke",
  authenticate,
  requirePermission("aicoreadmin"),
  invokeAiPlaygroundValidator,
  validate,
  AiPlaygroundController.invoke
);

router.get("/history", authenticate, requirePermission("aicore"), AiPlaygroundController.history);

export default router;

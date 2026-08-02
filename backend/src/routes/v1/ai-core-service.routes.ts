import { Router, type Router as ExpressRouter } from "express";

import { AiCapabilityController } from "../../controllers/ai-capability.controller.js";
import { authenticateService } from "../../middleware/service-auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import {
  aiCapabilityKeyParamValidator,
  invokeAiCapabilityValidator,
} from "../../validators/ai-capability.validator.js";

// n8n-facing surface (ADR-0021 Phase 3), mirrors crm-service.routes.ts: same
// authenticateService gate, no AutomationConnection/user identity involved.
// Kept separate from ai-core-capabilities.routes.ts rather than folding
// service auth into it, since that route's architecture is frozen.
const router: ExpressRouter = Router();

router.use(authenticateService);

router.post(
  "/:capabilityKey/invoke",
  aiCapabilityKeyParamValidator,
  invokeAiCapabilityValidator,
  validate,
  AiCapabilityController.invokeService
);

export default router;

import { Router, type Router as ExpressRouter } from "express";

import { AiCapabilityController } from "../../controllers/ai-capability.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import {
  aiCapabilityIdParamValidator,
  aiCapabilityKeyParamValidator,
  createAiCapabilityValidator,
  invokeAiCapabilityValidator,
  updateAiCapabilityValidator,
} from "../../validators/ai-capability.validator.js";

const router: ExpressRouter = Router();

// The one endpoint every business module / n8n workflow uses (architecture
// frozen — ADR-0021). "aicore" only, never "aicoreadmin" — a Capability
// invoke can never override routing the way Brain-direct/Playground can.
router.post(
  "/:capabilityKey/invoke",
  authenticate,
  requirePermission("aicore"),
  aiCapabilityKeyParamValidator,
  invokeAiCapabilityValidator,
  validate,
  AiCapabilityController.invoke
);

router.get("/", authenticate, requirePermission("aicore"), AiCapabilityController.list);

router.get(
  "/:id",
  authenticate,
  requirePermission("aicore"),
  aiCapabilityIdParamValidator,
  validate,
  AiCapabilityController.getById
);

router.post(
  "/",
  authenticate,
  requirePermission("aicoreadmin"),
  createAiCapabilityValidator,
  validate,
  AiCapabilityController.create
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("aicoreadmin"),
  aiCapabilityIdParamValidator,
  updateAiCapabilityValidator,
  validate,
  AiCapabilityController.update
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("aicoreadmin"),
  aiCapabilityIdParamValidator,
  validate,
  AiCapabilityController.remove
);

export default router;

import { Router, type Router as ExpressRouter } from "express";

import { AiProviderController } from "../../controllers/ai-provider.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import {
  addAiProviderCredentialValidator,
  aiProviderIdParamValidator,
  createAiProviderValidator,
  rotateAiProviderCredentialValidator,
  updateAiProviderValidator,
} from "../../validators/ai-provider.validator.js";

const router: ExpressRouter = Router();

// "/plugins" must be registered before "/:id" — same reasoning as
// automation-mcp-servers.routes.ts's own "/providers" route.
router.get("/plugins", authenticate, requirePermission("aicore"), AiProviderController.listRegisteredPlugins);

router.get("/", authenticate, requirePermission("aicore"), AiProviderController.list);

router.post(
  "/",
  authenticate,
  requirePermission("aicoreadmin"),
  createAiProviderValidator,
  validate,
  AiProviderController.create
);

router.get(
  "/:id",
  authenticate,
  requirePermission("aicore"),
  aiProviderIdParamValidator,
  validate,
  AiProviderController.getById
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("aicoreadmin"),
  aiProviderIdParamValidator,
  updateAiProviderValidator,
  validate,
  AiProviderController.update
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("aicoreadmin"),
  aiProviderIdParamValidator,
  validate,
  AiProviderController.remove
);

// Credential store is stricter ("aicoreadmin" only), same reasoning as
// automation/automationcredentials — AiProvider itself is platform
// infrastructure, but a credential can grant hosted-API access.
router.post(
  "/:id/credentials",
  authenticate,
  requirePermission("aicoreadmin"),
  aiProviderIdParamValidator,
  addAiProviderCredentialValidator,
  validate,
  AiProviderController.addCredential
);

router.patch(
  "/:id/credentials/:credentialId/rotate",
  authenticate,
  requirePermission("aicoreadmin"),
  aiProviderIdParamValidator,
  rotateAiProviderCredentialValidator,
  validate,
  AiProviderController.rotateCredential
);

// Operational, not a config mutation — "aicore" only, same reasoning as
// automation-mcp-servers.routes.ts's own health-check trigger.
router.post(
  "/:id/health-check",
  authenticate,
  requirePermission("aicore"),
  aiProviderIdParamValidator,
  validate,
  AiProviderController.checkHealth
);

export default router;

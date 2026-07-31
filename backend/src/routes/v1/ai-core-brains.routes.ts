import { Router, type Router as ExpressRouter } from "express";

import { AiBrainController } from "../../controllers/ai-brain.controller.js";
import { AiPromptController } from "../../controllers/ai-prompt.controller.js";
import { AiRoutingPolicyController } from "../../controllers/ai-routing-policy.controller.js";
import { AiEvaluationController } from "../../controllers/ai-evaluation.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  aiBrainIdParamValidator,
  aiBrainKeyParamValidator,
  createAiBrainValidator,
  invokeAiBrainValidator,
  updateAiBrainValidator,
} from "../../validators/ai-brain.validator.js";
import {
  aiBrainIdForPromptParamValidator,
  aiPromptIdParamValidator,
  createAiPromptValidator,
} from "../../validators/ai-prompt.validator.js";
import {
  aiBrainIdForPolicyParamValidator,
  aiRoutingPolicyIdParamValidator,
  createAiRoutingPolicyValidator,
} from "../../validators/ai-routing-policy.validator.js";
import { runAiEvaluationValidator } from "../../validators/ai-evaluation.validator.js";

const router: ExpressRouter = Router();

// Administrative/Playground-only — "aicoreadmin", never "aicore" (§2, §6,
// §15). Business-module traffic never reaches this route.
router.post(
  "/:brainKey/invoke",
  authenticate,
  requirePermission("aicoreadmin"),
  aiBrainKeyParamValidator,
  invokeAiBrainValidator,
  validate,
  AiBrainController.invoke
);

router.get("/", authenticate, requirePermission("aicore"), AiBrainController.list);

router.post("/", authenticate, requirePermission("aicoreadmin"), createAiBrainValidator, validate, AiBrainController.create);

router.get("/:id", authenticate, requirePermission("aicore"), aiBrainIdParamValidator, validate, AiBrainController.getById);

router.patch(
  "/:id",
  authenticate,
  requirePermission("aicoreadmin"),
  aiBrainIdParamValidator,
  updateAiBrainValidator,
  validate,
  AiBrainController.update
);

router.delete("/:id", authenticate, requirePermission("aicoreadmin"), aiBrainIdParamValidator, validate, AiBrainController.remove);

// --- Prompt Library (nested under a Brain) --------------------------------

router.get(
  "/:brainId/prompts",
  authenticate,
  requirePermission("aicore"),
  aiBrainIdForPromptParamValidator,
  validate,
  AiPromptController.list
);

router.post(
  "/:brainId/prompts",
  authenticate,
  requirePermission("aicoreadmin"),
  aiBrainIdForPromptParamValidator,
  createAiPromptValidator,
  validate,
  AiPromptController.create
);

router.post(
  "/:brainId/prompts/:promptId/activate",
  authenticate,
  requirePermission("aicoreadmin"),
  aiBrainIdForPromptParamValidator,
  aiPromptIdParamValidator,
  validate,
  AiPromptController.activate
);

router.post(
  "/:brainId/prompts/:promptId/evaluate",
  authenticate,
  requirePermission("aicoreadmin"),
  aiBrainIdForPromptParamValidator,
  aiPromptIdParamValidator,
  runAiEvaluationValidator,
  validate,
  AiEvaluationController.run
);

router.get(
  "/:brainId/prompts/:promptId/evaluations",
  authenticate,
  requirePermission("aicore"),
  aiBrainIdForPromptParamValidator,
  aiPromptIdParamValidator,
  validate,
  AiEvaluationController.listByPrompt
);

// --- Routing Policy (nested under a Brain) --------------------------------

router.get(
  "/:brainId/routing-policy",
  authenticate,
  requirePermission("aicore"),
  aiBrainIdForPolicyParamValidator,
  validate,
  AiRoutingPolicyController.list
);

router.post(
  "/:brainId/routing-policy",
  authenticate,
  requirePermission("aicoreadmin"),
  aiBrainIdForPolicyParamValidator,
  createAiRoutingPolicyValidator,
  validate,
  AiRoutingPolicyController.create
);

router.post(
  "/:brainId/routing-policy/:policyId/activate",
  authenticate,
  requirePermission("aicoreadmin"),
  aiBrainIdForPolicyParamValidator,
  aiRoutingPolicyIdParamValidator,
  validate,
  AiRoutingPolicyController.activate
);

export default router;

import { body, param } from "express-validator";

const STRATEGIES = ["COST", "LATENCY", "QUALITY", "BALANCED"];

export const aiBrainIdForPolicyParamValidator = [param("brainId").notEmpty().withMessage("Brain ID is required.")];
export const aiRoutingPolicyIdParamValidator = [param("policyId").notEmpty().withMessage("Policy ID is required.")];

export const createAiRoutingPolicyValidator = [
  body("strategy").optional().isIn(STRATEGIES).withMessage(`strategy must be one of: ${STRATEGIES.join(", ")}.`),
  body("requiredTag").optional({ nullable: true }).trim().isString(),
  body("preferredProviderId").trim().notEmpty().withMessage("preferredProviderId is required."),
  body("preferredModelId").trim().notEmpty().withMessage("preferredModelId is required."),
  body("fallbackProviderId").optional({ nullable: true }).trim().isString(),
  body("fallbackModelId").optional({ nullable: true }).trim().isString(),
  body("maxRetries").optional().isInt({ min: 0, max: 10 }).toInt(),
  body("timeoutMs").optional().isInt({ min: 1000 }).toInt(),
  body("confidenceHighThreshold").optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body("confidenceMediumThreshold").optional().isFloat({ min: 0, max: 1 }).toFloat(),
];

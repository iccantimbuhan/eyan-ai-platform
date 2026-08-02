import { body, param, query } from "express-validator";

import {
  EstimatedTimeline,
  LeadPriority,
  QualificationLevel,
} from "../generated/prisma/enums.js";

const VALIDATION_TARGET_STATUSES: string[] = ["VALIDATED", "DISQUALIFIED"];
const LEAD_PRIORITIES = Object.values(LeadPriority);
const QUALIFICATION_LEVELS = Object.values(QualificationLevel);
// buyingIntent/urgency/riskLevel accept one additional value beyond the
// QualificationLevel enum itself: a real model output legitimately returns
// "UNKNOWN" when there's not enough signal to classify (the DB column can't
// store it directly — see CrmAutomationIngestService, which normalizes it
// to null before the Prisma write). confidenceTier below deliberately does
// NOT get this — it's AI Core's own computed HIGH/MEDIUM/LOW tier, never
// "UNKNOWN".
const QUALIFICATION_LEVELS_OR_UNKNOWN = [...QUALIFICATION_LEVELS, "UNKNOWN"];
const ESTIMATED_TIMELINES = Object.values(EstimatedTimeline);

// Shared across every /crm/service/* mutation — ADR-0019 Decisions 5 & 6.
const executionMetaValidators = [
  body("contractVersion").notEmpty().withMessage("contractVersion is required."),

  body("workflowExecutionId")
    .trim()
    .notEmpty()
    .withMessage("workflowExecutionId is required."),

  body("workflowName").trim().notEmpty().withMessage("workflowName is required."),

  body("durationMs").optional().isInt({ min: 0 }).toInt(),

  body("errorMessage").optional().trim().isLength({ max: 2000 }),
];

export const dedupeLeadQueryValidator = [
  query("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
];

export const leadIdParamValidator = [param("id").notEmpty().withMessage("Lead ID is required.")];

export const assignLeadAutomatedValidator = [
  ...executionMetaValidators,

  body("assignedToId").trim().notEmpty().withMessage("assignedToId is required."),
];

export const applyValidationResultValidator = [
  ...executionMetaValidators,

  body("status")
    .isIn(VALIDATION_TARGET_STATUSES)
    .withMessage(`status must be one of: ${VALIDATION_TARGET_STATUSES.join(", ")}.`),
];

export const applyQualificationResultValidator = [
  ...executionMetaValidators,

  body("provider").trim().notEmpty().withMessage("provider is required."),
  body("model").trim().notEmpty().withMessage("model is required."),
  body("promptVersion").trim().notEmpty().withMessage("promptVersion is required."),

  body("leadScore").isInt({ min: 0, max: 100 }).withMessage("leadScore must be 0-100.").toInt(),

  body("confidence")
    .isFloat({ min: 0, max: 1 })
    .withMessage("confidence must be 0.0-1.0.")
    .toFloat(),

  body("priority").isIn(LEAD_PRIORITIES).withMessage("Invalid priority."),

  body("industry").optional().trim().isLength({ max: 200 }),
  body("companySizeEstimate").optional().trim().isLength({ max: 100 }),

  body("budgetEstimateMin").optional().isFloat({ min: 0 }).toFloat(),
  body("budgetEstimateMax").optional().isFloat({ min: 0 }).toFloat(),
  body("budgetEstimateCurrency").optional().trim().isLength({ max: 10 }),

  body("buyingIntent").optional().isIn(QUALIFICATION_LEVELS_OR_UNKNOWN).withMessage("Invalid buyingIntent."),
  body("urgency").optional().isIn(QUALIFICATION_LEVELS_OR_UNKNOWN).withMessage("Invalid urgency."),
  body("decisionMakerIdentified").optional().isBoolean().toBoolean(),
  body("estimatedTimeline")
    .optional()
    .isIn(ESTIMATED_TIMELINES)
    .withMessage("Invalid estimatedTimeline."),
  body("riskLevel").optional().isIn(QUALIFICATION_LEVELS_OR_UNKNOWN).withMessage("Invalid riskLevel."),

  body("painPoints").optional().isArray().withMessage("painPoints must be an array."),
  body("painPoints.*").optional().isString().trim().isLength({ max: 500 }),

  body("recommendedAction")
    .trim()
    .notEmpty()
    .withMessage("recommendedAction is required.")
    .isLength({ max: 2000 }),

  body("summary").trim().notEmpty().withMessage("summary is required.").isLength({ max: 2000 }),

  body("reasoning")
    .trim()
    .notEmpty()
    .withMessage("reasoning is required.")
    .isLength({ max: 4000 }),

  body("needsManualReview").optional().isBoolean().toBoolean(),

  // AI Core's own HIGH/MEDIUM/LOW confidence tier (AiInvokeResult.confidence
  // — distinct from the numeric `confidence` field above, which is the raw
  // 0.0-1.0 value the model returned). Drives Phase 4's pipeline
  // auto-routing; not recomputed backend-side to avoid duplicating
  // AiRoutingPolicy's threshold logic in two places.
  body("confidenceTier")
    .optional()
    .isIn(QUALIFICATION_LEVELS)
    .withMessage("Invalid confidenceTier."),
];

import { body, param } from "express-validator";

export const aiModelIdParamValidator = [param("id").notEmpty().withMessage("Model ID is required.")];

export const createAiModelValidator = [
  body("providerId").trim().notEmpty().withMessage("providerId is required."),
  body("modelKey").trim().notEmpty().withMessage("modelKey is required."),
  body("displayName").trim().notEmpty().withMessage("Display name is required."),
  body("tags").optional().isArray().withMessage("tags must be an array."),
  body("tags.*").optional().isString(),
  body("contextWindow").optional().isInt({ min: 1 }).toInt(),
  body("costPerInputToken").optional().isFloat({ min: 0 }),
  body("costPerOutputToken").optional().isFloat({ min: 0 }),
  body("isEnabled").optional().isBoolean().toBoolean(),
];

export const updateAiModelValidator = [
  body("displayName").optional().trim().notEmpty(),
  body("tags").optional().isArray(),
  body("tags.*").optional().isString(),
  body("contextWindow").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("costPerInputToken").optional({ nullable: true }).isFloat({ min: 0 }),
  body("costPerOutputToken").optional({ nullable: true }).isFloat({ min: 0 }),
  body("isEnabled").optional().isBoolean().toBoolean(),
];

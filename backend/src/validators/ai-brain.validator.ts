import { body, param } from "express-validator";

const MEMORY_STRATEGIES = ["NONE", "CONVERSATION", "KNOWLEDGE_BASE", "VECTOR", "RAG", "LONG_TERM"];

export const aiBrainIdParamValidator = [param("id").notEmpty().withMessage("Brain ID is required.")];
export const aiBrainKeyParamValidator = [param("brainKey").notEmpty().withMessage("Brain key is required.")];

export const createAiBrainValidator = [
  body("key")
    .trim()
    .notEmpty()
    .withMessage("Key is required.")
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Key must be lowercase kebab-case (letters, numbers, hyphens only)."),
  body("name").trim().notEmpty().withMessage("Name is required.").isLength({ max: 200 }),
  body("description").trim().notEmpty().withMessage("Description is required."),
  body("category").trim().notEmpty().withMessage("Category is required."),
  body("memoryStrategy").optional().isIn(MEMORY_STRATEGIES).withMessage(`memoryStrategy must be one of: ${MEMORY_STRATEGIES.join(", ")}.`),
  body("isEnabled").optional().isBoolean().toBoolean(),
];

export const updateAiBrainValidator = [
  body("name").optional().trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().notEmpty(),
  body("category").optional().trim().notEmpty(),
  body("memoryStrategy").optional().isIn(MEMORY_STRATEGIES),
  body("isEnabled").optional().isBoolean().toBoolean(),
];

export const invokeAiBrainValidator = [
  body("input").isObject().withMessage("input must be an object."),
  body("context").optional().isObject().withMessage("context must be an object."),
  body("context.expectJson").optional().isBoolean().toBoolean(),
];

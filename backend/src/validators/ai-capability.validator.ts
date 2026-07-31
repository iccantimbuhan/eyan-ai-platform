import { body, param } from "express-validator";

export const aiCapabilityIdParamValidator = [param("id").notEmpty().withMessage("Capability ID is required.")];
export const aiCapabilityKeyParamValidator = [param("capabilityKey").notEmpty().withMessage("Capability key is required.")];

export const createAiCapabilityValidator = [
  body("key")
    .trim()
    .notEmpty()
    .withMessage("Key is required.")
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Key must be lowercase kebab-case (letters, numbers, hyphens only)."),
  body("name").trim().notEmpty().withMessage("Name is required.").isLength({ max: 200 }),
  body("description").trim().notEmpty().withMessage("Description is required."),
  body("brainId").trim().notEmpty().withMessage("brainId is required."),
  body("isEnabled").optional().isBoolean().toBoolean(),
];

export const updateAiCapabilityValidator = [
  body("name").optional().trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().notEmpty(),
  body("brainId").optional().trim().notEmpty(),
  body("isEnabled").optional().isBoolean().toBoolean(),
];

export const invokeAiCapabilityValidator = [
  body("input").isObject().withMessage("input must be an object."),
  body("context").optional().isObject().withMessage("context must be an object."),
  body("context.expectJson").optional().isBoolean().toBoolean(),
];

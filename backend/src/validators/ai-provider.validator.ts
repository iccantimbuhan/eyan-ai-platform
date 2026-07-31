import { body, param } from "express-validator";

const PROVIDER_KINDS = ["LOCAL", "HOSTED"];

export const aiProviderIdParamValidator = [param("id").notEmpty().withMessage("Provider ID is required.")];

export const createAiProviderValidator = [
  body("key")
    .trim()
    .notEmpty()
    .withMessage("Key is required.")
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Key must be lowercase kebab-case (letters, numbers, hyphens only)."),
  body("displayName").trim().notEmpty().withMessage("Display name is required."),
  body("kind").trim().notEmpty().isIn(PROVIDER_KINDS).withMessage(`kind must be one of: ${PROVIDER_KINDS.join(", ")}.`),
  body("baseUrl").optional().trim().isURL({ require_tld: false }).withMessage("baseUrl must be a valid URL."),
  body("isEnabled").optional().isBoolean().toBoolean(),
  body("rateLimitPerMinute").optional().isInt({ min: 1 }).toInt(),
];

export const updateAiProviderValidator = [
  body("displayName").optional().trim().notEmpty(),
  body("baseUrl").optional({ nullable: true }).trim().isURL({ require_tld: false }),
  body("isEnabled").optional().isBoolean().toBoolean(),
  body("rateLimitPerMinute").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];

export const addAiProviderCredentialValidator = [
  body("label").trim().notEmpty().withMessage("Label is required."),
  body("credentials").isObject().withMessage("credentials must be a non-empty object."),
];

export const rotateAiProviderCredentialValidator = [
  param("credentialId").notEmpty().withMessage("Credential ID is required."),
  body("credentials").isObject().withMessage("credentials must be a non-empty object."),
];

import { body, param } from "express-validator";

function isNonEmptyPlainObject(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length > 0
  );
}

const credentialsValidator = body("credentials").custom((value) => {
  if (!isNonEmptyPlainObject(value)) {
    throw new Error("Credentials must be a non-empty object.");
  }

  return true;
});

export const connectionIdParamValidator = [
  param("id").notEmpty().withMessage("Connection ID is required."),
];

export const createConnectionValidator = [
  body("provider")
    .trim()
    .notEmpty()
    .withMessage("Provider is required.")
    .isLength({ max: 100 })
    .withMessage("Provider must not exceed 100 characters."),

  body("label")
    .trim()
    .notEmpty()
    .withMessage("Label is required.")
    .isLength({ max: 200 })
    .withMessage("Label must not exceed 200 characters."),

  credentialsValidator,

  body("metadata").optional().isObject().withMessage("Metadata must be an object."),
];

export const updateConnectionValidator = [
  body("label")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Label cannot be empty.")
    .isLength({ max: 200 })
    .withMessage("Label must not exceed 200 characters."),

  body("metadata").optional().isObject().withMessage("Metadata must be an object."),
];

export const rotateConnectionCredentialsValidator = [credentialsValidator];

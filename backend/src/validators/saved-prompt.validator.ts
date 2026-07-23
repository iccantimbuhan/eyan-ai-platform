import { body, param } from "express-validator";

import { ContentType } from "../generated/prisma/enums.js";

const CONTENT_TYPES = Object.values(ContentType);

export const createSavedPromptValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 200 })
    .withMessage("Name must not exceed 200 characters."),

  body("promptBody")
    .trim()
    .notEmpty()
    .withMessage("Prompt body is required.")
    .isLength({ max: 4000 })
    .withMessage("Prompt body must not exceed 4000 characters."),

  body("contentType")
    .trim()
    .notEmpty()
    .withMessage("Content type is required.")
    .isIn(CONTENT_TYPES)
    .withMessage("Invalid content type."),
];

export const updateSavedPromptValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty.")
    .isLength({ max: 200 })
    .withMessage("Name must not exceed 200 characters."),

  body("promptBody")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Prompt body cannot be empty.")
    .isLength({ max: 4000 })
    .withMessage("Prompt body must not exceed 4000 characters."),

  body("contentType")
    .optional()
    .trim()
    .isIn(CONTENT_TYPES)
    .withMessage("Invalid content type."),
];

export const savedPromptIdParamValidator = [
  param("id")
    .notEmpty()
    .withMessage("Saved prompt ID is required."),
];

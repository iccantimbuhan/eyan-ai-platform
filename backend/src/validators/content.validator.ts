import { body, param, query } from "express-validator";

import { ContentType } from "../generated/prisma/enums.js";

const CONTENT_TYPES = Object.values(ContentType);

export const generateContentValidator = [
  body("projectId")
    .trim()
    .notEmpty()
    .withMessage("Project ID is required."),

  body("type")
    .trim()
    .notEmpty()
    .withMessage("Content type is required.")
    .isIn(CONTENT_TYPES)
    .withMessage("Invalid content type."),

  body("prompt")
    .trim()
    .notEmpty()
    .withMessage("Prompt is required.")
    .isLength({ max: 4000 })
    .withMessage("Prompt must not exceed 4000 characters."),
];

export const contentIdParamValidator = [
  param("id")
    .notEmpty()
    .withMessage("Content ID is required."),
];

export const listContentValidator = [
  query("projectId")
    .trim()
    .notEmpty()
    .withMessage("Project ID is required."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt(),
];

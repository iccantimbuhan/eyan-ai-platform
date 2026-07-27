import { body, param, query } from "express-validator";

export const createProjectValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required.")
    .isLength({ max: 100 })
    .withMessage("Project name must not exceed 100 characters."),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string."),
];

export const updateProjectValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Project name cannot be empty.")
    .isLength({ max: 100 })
    .withMessage("Project name must not exceed 100 characters."),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string."),

  body("status")
    .optional()
    .isIn([
      "DRAFT",
      "IN_PROGRESS",
      "REVIEW",
      "PUBLISHED",
    ])
    .withMessage("Invalid project status."),
];

export const projectIdParamValidator = [
  param("id")
    .notEmpty()
    .withMessage("Project ID is required."),
];

export const listProjectsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt(),

  query("search")
    .optional()
    .isString(),
];

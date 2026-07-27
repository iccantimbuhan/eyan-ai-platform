import { param, query } from "express-validator";

export const projectIdParamValidator = [
  param("projectId").trim().notEmpty().withMessage("Project ID is required."),
];

export const activityQueryValidator = [
  param("projectId").trim().notEmpty().withMessage("Project ID is required."),

  query("page").optional().isInt({ min: 1 }).toInt(),

  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
];

// Sprint 6.6 (Production Dashboard) — the platform-wide activity feed has
// no :projectId param to validate.
export const platformActivityQueryValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),

  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
];

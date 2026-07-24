import { param, query } from "express-validator";

export const imageIdParamValidator = [
  param("id").notEmpty().withMessage("Image ID is required."),
];

export const listImagesValidator = [
  query("projectId")
    .trim()
    .notEmpty()
    .withMessage("Project ID is required."),

  query("page").optional().isInt({ min: 1 }).toInt(),

  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
];

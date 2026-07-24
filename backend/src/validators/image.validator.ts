import { body, param, query } from "express-validator";

const IMAGE_FORMATS = ["png", "jpg", "webp"];

export const generateImageValidator = [
  body("projectId")
    .trim()
    .notEmpty()
    .withMessage("Project ID is required."),

  body("prompt")
    .trim()
    .notEmpty()
    .withMessage("Prompt is required.")
    .isLength({ max: 2000 })
    .withMessage("Prompt must not exceed 2000 characters."),

  body("negativePrompt")
    .optional()
    .trim()
    .isString()
    .isLength({ max: 2000 })
    .withMessage("Negative prompt must not exceed 2000 characters."),

  body("width").optional().isInt({ min: 64, max: 2048 }).toInt(),

  body("height").optional().isInt({ min: 64, max: 2048 }).toInt(),

  body("format")
    .optional()
    .isIn(IMAGE_FORMATS)
    .withMessage("Invalid image format."),

  body("provider")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Provider name must not exceed 100 characters.")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Provider name may only contain letters, numbers, hyphens, and underscores."),
];

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

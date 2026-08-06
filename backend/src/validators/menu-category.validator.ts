import { body, param } from "express-validator";

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const categoryIdParamValidator = [
  param("categoryId").notEmpty().withMessage("Menu category ID is required."),
];

export const createMenuCategoryValidator = [
  body("name").trim().notEmpty().isLength({ max: 200 }).withMessage("Name is required."),

  body("displayOrder").optional().isInt({ min: 0 }).withMessage("Invalid display order."),
];

export const updateMenuCategoryValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Name cannot be empty."),

  body("displayOrder").optional().isInt({ min: 0 }).withMessage("Invalid display order."),
];

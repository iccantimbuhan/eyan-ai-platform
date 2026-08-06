import { body, param } from "express-validator";

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const ingredientCategoryIdParamValidator = [
  param("ingredientCategoryId").notEmpty().withMessage("Ingredient category ID is required."),
];

export const createIngredientCategoryValidator = [
  body("name").trim().notEmpty().isLength({ max: 200 }).withMessage("Name is required."),
];

export const updateIngredientCategoryValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Name cannot be empty."),
];

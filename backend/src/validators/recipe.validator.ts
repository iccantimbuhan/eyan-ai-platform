import { body, param } from "express-validator";

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const recipeIdParamValidator = [
  param("recipeId").notEmpty().withMessage("Recipe ID is required."),
];

export const createRecipeValidator = [
  body("menuItemId").notEmpty().withMessage("Menu item is required."),

  body("notes").optional({ nullable: true }).trim().isLength({ max: 1000 }),
];

export const updateRecipeValidator = [
  body("notes").optional({ nullable: true }).trim().isLength({ max: 1000 }),
];

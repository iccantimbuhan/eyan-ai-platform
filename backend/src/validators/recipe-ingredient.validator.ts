import { body, param } from "express-validator";

export const recipeIdParamValidator = [
  param("recipeId").notEmpty().withMessage("Recipe ID is required."),
];

export const recipeIngredientIdParamValidator = [
  param("recipeIngredientId").notEmpty().withMessage("Recipe ingredient ID is required."),
];

export const createRecipeIngredientValidator = [
  body("ingredientId").notEmpty().withMessage("Ingredient is required."),

  body("unitId").notEmpty().withMessage("Unit is required."),

  body("quantity").isFloat({ min: 0.01 }).withMessage("Quantity must be greater than 0."),
];

export const updateRecipeIngredientValidator = [
  body("ingredientId").optional().notEmpty().withMessage("Invalid ingredient."),

  body("unitId").optional().notEmpty().withMessage("Invalid unit."),

  body("quantity")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Quantity must be greater than 0."),
];

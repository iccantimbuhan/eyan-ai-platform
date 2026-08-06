import { body, param } from "express-validator";

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const ingredientIdParamValidator = [
  param("ingredientId").notEmpty().withMessage("Ingredient ID is required."),
];

export const createIngredientValidator = [
  body("name").trim().notEmpty().isLength({ max: 200 }).withMessage("Name is required."),

  body("ingredientCategoryId").optional({ nullable: true }).isString(),

  body("supplierIds").optional().isArray().withMessage("supplierIds must be an array."),
  body("supplierIds.*").isString().withMessage("Invalid supplier id."),
];

export const updateIngredientValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Name cannot be empty."),

  body("ingredientCategoryId").optional({ nullable: true }).isString(),

  body("supplierIds").optional().isArray().withMessage("supplierIds must be an array."),
  body("supplierIds.*").isString().withMessage("Invalid supplier id."),
];

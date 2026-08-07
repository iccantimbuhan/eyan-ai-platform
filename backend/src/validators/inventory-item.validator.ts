import { body, param } from "express-validator";

export const branchIdParamValidator = [
  param("branchId").notEmpty().withMessage("Branch ID is required."),
];

export const inventoryItemIdParamValidator = [
  param("inventoryItemId").notEmpty().withMessage("Inventory item ID is required."),
];

export const createInventoryItemValidator = [
  body("ingredientId").notEmpty().withMessage("Ingredient is required."),

  body("unitId").notEmpty().withMessage("Unit is required."),

  body("openingQuantity")
    .isFloat({ min: 0 })
    .withMessage("Opening quantity must be zero or greater."),

  body("minimumQuantity")
    .isFloat({ min: 0 })
    .withMessage("Minimum quantity must be zero or greater."),

  body("reason").optional().isString(),
];

export const updateInventoryItemValidator = [
  body("minimumQuantity")
    .isFloat({ min: 0 })
    .withMessage("Minimum quantity must be zero or greater."),
];

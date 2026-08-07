import { body } from "express-validator";

export const createAdjustmentValidator = [
  body("quantityDelta")
    .isFloat()
    .withMessage("Quantity delta must be a number.")
    .custom((value) => Number(value) !== 0)
    .withMessage("Quantity delta must not be zero."),

  body("reason").trim().notEmpty().withMessage("A reason is required for an adjustment."),
];

export const createWasteValidator = [
  body("quantity").isFloat({ gt: 0 }).withMessage("Waste quantity must be greater than 0."),

  body("reason").trim().notEmpty().withMessage("A reason is required for waste."),
];

export const createStockCountValidator = [
  body("countedQuantity")
    .isFloat({ min: 0 })
    .withMessage("Counted quantity must be zero or greater."),

  body("reason").optional().isString(),
];

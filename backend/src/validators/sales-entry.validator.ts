import { body, param } from "express-validator";

export const entryIdParamValidator = [
  param("entryId").notEmpty().withMessage("Entry ID is required."),
];

export const createChannelEntryValidator = [
  body("salesChannelId").notEmpty().withMessage("Sales channel is required."),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be zero or greater."),
];

export const createPaymentMethodEntryValidator = [
  body("salesPaymentMethodId").notEmpty().withMessage("Payment method is required."),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be zero or greater."),
  body("transactionCount").optional().isInt({ min: 0 }).withMessage("Transaction count must be zero or greater."),
];

export const createCategoryEntryValidator = [
  body("salesCategoryId").notEmpty().withMessage("Sales category is required."),
  body("quantity").optional().isFloat({ min: 0 }).withMessage("Quantity must be zero or greater."),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be zero or greater."),
];

export const createItemEntryValidator = [
  body("menuItemId").optional().isString(),
  body("itemName").trim().notEmpty().withMessage("Item name is required."),
  body("categoryName").optional().isString(),
  body("quantity").isFloat({ gt: 0 }).withMessage("Quantity must be greater than zero."),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be zero or greater."),
];

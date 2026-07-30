import { body, query } from "express-validator";

export const getBudgetValidator = [
  query("period")
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("period must be in YYYY-MM format."),
];

export const setBudgetValidator = [
  body("period")
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("period must be in YYYY-MM format."),

  body("monthlyLimit")
    .isFloat({ min: 0.01 })
    .withMessage("monthlyLimit must be greater than 0."),
];

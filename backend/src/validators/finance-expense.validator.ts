import { body, param, query } from "express-validator";

import { ExpenseCategory, PaymentMethod } from "../generated/prisma/enums.js";

const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);
const PAYMENT_METHODS = Object.values(PaymentMethod);
const SORT_FIELDS = ["date", "amount", "createdAt"];
const SORT_DIRECTIONS = ["asc", "desc"];

export const listExpensesValidator = [
  query("category").optional().isIn(EXPENSE_CATEGORIES).withMessage("Invalid category."),

  query("dateFrom").optional().isISO8601().withMessage("dateFrom must be a valid date."),

  query("dateTo").optional().isISO8601().withMessage("dateTo must be a valid date."),

  query("search").optional().trim().isLength({ max: 200 }),

  query("page").optional().isInt({ min: 1 }).toInt(),

  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),

  query("sortBy").optional().isIn(SORT_FIELDS).withMessage("Invalid sortBy."),

  query("sortDir").optional().isIn(SORT_DIRECTIONS).withMessage("Invalid sortDir."),
];

export const expenseIdParamValidator = [
  param("id").notEmpty().withMessage("Expense ID is required."),
];

// amount is validated as a numeric string but never .toFloat()'d — it stays
// a string all the way to Prisma's Decimal field. See
// dto/finance-expense.mapper.ts's comment on why money never round-trips
// through a JS number.
export const createExpenseValidator = [
  body("date").isISO8601().withMessage("A valid date is required."),

  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0."),

  body("category").isIn(EXPENSE_CATEGORIES).withMessage("Invalid category."),

  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Invalid payment method."),

  body("description").optional().trim().isLength({ max: 500 }),

  body("isRecurring").optional().isBoolean().withMessage("isRecurring must be a boolean."),
];

export const updateExpenseValidator = [
  body("date").optional().isISO8601().withMessage("Invalid date."),

  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0."),

  body("category").optional().isIn(EXPENSE_CATEGORIES).withMessage("Invalid category."),

  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Invalid payment method."),

  body("description").optional().trim().isLength({ max: 500 }),
];

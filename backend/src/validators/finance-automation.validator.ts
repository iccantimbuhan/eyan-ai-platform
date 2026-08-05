import { body, query } from "express-validator";

import { ExpenseCategory, PaymentMethod } from "../generated/prisma/enums.js";

const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);
const PAYMENT_METHODS = Object.values(PaymentMethod);
const AUTOMATION_CHANNELS = ["slack", "telegram", "whatsapp", "retell", "ocr", "web-chat"];
const AUTOMATION_INTENTS = ["CREATE_EXPENSE", "UPLOAD_RECEIPT"];

// Shared across every /finance/service/* mutation — mirrors
// crm-automation.validator.ts's executionMetaValidators (ADR-0019 Decisions
// 5 & 6), applied here per ADR-0024.
const executionMetaValidators = [
  body("contractVersion").notEmpty().withMessage("contractVersion is required."),

  body("workflowExecutionId")
    .trim()
    .notEmpty()
    .withMessage("workflowExecutionId is required."),

  body("workflowName").trim().notEmpty().withMessage("workflowName is required."),

  body("durationMs").optional().isInt({ min: 0 }).toInt(),

  body("errorMessage").optional().trim().isLength({ max: 2000 }),
];

// Channel-agnostic provenance — required on every mutation so `createdBy`
// can carry real audit value (e.g. "slack:U012ABC") instead of null. See
// FinanceAutomationService.createExpense().
const sourceValidators = [
  body("source.channel").isIn(AUTOMATION_CHANNELS).withMessage("Invalid source.channel."),

  body("source.externalUserId")
    .trim()
    .notEmpty()
    .withMessage("source.externalUserId is required."),

  body("source.externalMessageId").optional().trim().isLength({ max: 200 }),
];

// amount is validated as a numeric string but never .toFloat()'d — matches
// createExpenseValidator's own comment (finance-expense.validator.ts): money
// stays a string all the way to Prisma's Decimal field.
export const createExpenseAutomatedValidator = [
  ...executionMetaValidators,
  ...sourceValidators,

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

  body("intent").optional().isIn(AUTOMATION_INTENTS).withMessage("Invalid intent."),
];

export const getDashboardAutomatedValidator = [
  query("period")
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("period must be in YYYY-MM format."),
];

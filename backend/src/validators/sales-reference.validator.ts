import { body, param } from "express-validator";

// Shared by SalesChannel/SalesPaymentMethod/SalesCategory create routes —
// identical single-field shape, see sales-reference.repository.ts's
// grouping rationale.
export const createSalesReferenceValidator = [
  body("name").trim().notEmpty().withMessage("Name is required."),
];

// SalesPaymentMethod create accepts an optional cash flag on top of the
// shared shape (ADR-0043) — the other three reference types stay on
// createSalesReferenceValidator unchanged.
export const createSalesPaymentMethodValidator = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("isCashEquivalent").optional().isBoolean().withMessage("isCashEquivalent must be a boolean."),
];

export const salesPaymentMethodIdParamValidator = [
  param("id").notEmpty().withMessage("Sales payment method ID is required."),
];

export const updateSalesPaymentMethodValidator = [
  body("isCashEquivalent").isBoolean().withMessage("isCashEquivalent must be a boolean."),
];

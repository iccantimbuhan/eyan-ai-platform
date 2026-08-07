import { body } from "express-validator";

// Shared by SalesChannel/SalesPaymentMethod/SalesCategory create routes —
// identical single-field shape, see sales-reference.repository.ts's
// grouping rationale.
export const createSalesReferenceValidator = [
  body("name").trim().notEmpty().withMessage("Name is required."),
];

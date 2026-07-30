import { query } from "express-validator";

export const getDashboardValidator = [
  query("period")
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage("period must be in YYYY-MM format."),
];

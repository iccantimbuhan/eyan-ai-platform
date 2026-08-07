import { body, param, query } from "express-validator";

export const salesIdParamValidator = [
  param("salesId").notEmpty().withMessage("Sales record ID is required."),
];

// businessDate can't be in the future — a day that hasn't happened yet has
// no sales to record. Backfilling past dates is expected and allowed.
function businessDateNotInFuture(value: string) {
  const date = new Date(value);
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  return date <= today;
}

export const createDailySalesRecordValidator = [
  body("businessDate")
    .isISO8601()
    .withMessage("A valid business date is required.")
    .bail()
    .custom(businessDateNotInFuture)
    .withMessage("Business date cannot be in the future."),

  body("source").isIn(["MANUAL", "POS_REPORT"]).withMessage("A valid source is required."),

  body("posReportType").optional().isIn(["Z_REPORT", "X_REPORT"]),
  body("posReportNumber").optional().isString(),
  body("posReportedTotal").optional().isFloat({ min: 0 }).withMessage("POS reported total must be zero or greater."),

  body("totalSales").isFloat({ min: 0 }).withMessage("Total sales must be zero or greater."),
  body("discountsTotal").optional().isFloat({ min: 0 }).withMessage("Discounts total must be zero or greater."),
  body("vouchersAmount").optional().isFloat({ min: 0 }).withMessage("Vouchers amount must be zero or greater."),
  body("vouchersCount").optional().isInt({ min: 0 }).withMessage("Vouchers count must be zero or greater."),

  body("notes").optional().isString(),
];

export const updateDailySalesRecordValidator = [
  body("source").optional().isIn(["MANUAL", "POS_REPORT"]),
  body("posReportType").optional({ nullable: true }).isIn(["Z_REPORT", "X_REPORT"]),
  body("posReportNumber").optional({ nullable: true }).isString(),
  body("posReportedTotal")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("POS reported total must be zero or greater."),
  body("totalSales").optional().isFloat({ min: 0 }).withMessage("Total sales must be zero or greater."),
  body("discountsTotal").optional().isFloat({ min: 0 }).withMessage("Discounts total must be zero or greater."),
  body("vouchersAmount").optional().isFloat({ min: 0 }).withMessage("Vouchers amount must be zero or greater."),
  body("vouchersCount").optional({ nullable: true }).isInt({ min: 0 }),
  body("notes").optional({ nullable: true }).isString(),
];

export const dailyQueryValidator = [
  query("date").isISO8601().withMessage("A valid date query parameter is required."),
];

export const weeklyQueryValidator = [
  query("startDate").isISO8601().withMessage("A valid startDate query parameter is required."),
  query("endDate").isISO8601().withMessage("A valid endDate query parameter is required."),
];

// Both periods are supplied explicitly by the caller — the backend never
// infers a "previous period" from the current one.
export const comparisonQueryValidator = [
  query("currentStartDate").isISO8601().withMessage("A valid currentStartDate query parameter is required."),
  query("currentEndDate").isISO8601().withMessage("A valid currentEndDate query parameter is required."),
  query("previousStartDate").isISO8601().withMessage("A valid previousStartDate query parameter is required."),
  query("previousEndDate").isISO8601().withMessage("A valid previousEndDate query parameter is required."),
];

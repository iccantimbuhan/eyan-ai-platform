import { param, query } from "express-validator";

export const listAuditLogsValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer."),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize must be between 1 and 100."),
];

export const connectionAuditLogParamValidator = [
  param("connectionId").notEmpty().withMessage("Connection ID is required."),
];

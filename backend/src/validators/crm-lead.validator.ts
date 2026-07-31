import { body, param, query } from "express-validator";

import { LeadPriority, LeadStatus } from "../generated/prisma/enums.js";

const LEAD_STATUSES = Object.values(LeadStatus);
const LEAD_PRIORITIES = Object.values(LeadPriority);
const SORT_FIELDS = ["createdAt", "score", "contactName"];
const SORT_DIRECTIONS = ["asc", "desc"];

// Public endpoint — validation is also this route's sanitization/abuse
// control, alongside the rate limiter (see middleware/rate-limit.middleware.ts).
export const createLeadValidator = [
  body("contactName").trim().notEmpty().withMessage("Name is required.").isLength({ max: 200 }),

  body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),

  body("phone").optional().trim().isLength({ max: 50 }),

  body("company").optional().trim().isLength({ max: 200 }),

  body("industry").optional().trim().isLength({ max: 200 }),

  body("companySize").optional().trim().isLength({ max: 100 }),
];

export const listLeadsValidator = [
  query("status").optional().isIn(LEAD_STATUSES).withMessage("Invalid status."),

  query("priority").optional().isIn(LEAD_PRIORITIES).withMessage("Invalid priority."),

  query("assignedToId").optional().trim().notEmpty(),

  query("search").optional().trim().isLength({ max: 200 }),

  query("page").optional().isInt({ min: 1 }).toInt(),

  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),

  query("sortBy").optional().isIn(SORT_FIELDS).withMessage("Invalid sortBy."),

  query("sortDir").optional().isIn(SORT_DIRECTIONS).withMessage("Invalid sortDir."),
];

export const leadIdParamValidator = [param("id").notEmpty().withMessage("Lead ID is required.")];

export const updateLeadValidator = [
  body("contactName").optional().trim().notEmpty().isLength({ max: 200 }),

  body("email").optional().trim().isEmail().withMessage("Invalid email.").normalizeEmail(),

  body("phone").optional().trim().isLength({ max: 50 }),

  body("company").optional().trim().isLength({ max: 200 }),

  body("industry").optional().trim().isLength({ max: 200 }),

  body("companySize").optional().trim().isLength({ max: 100 }),
];

export const updateLeadStatusValidator = [
  body("status").isIn(LEAD_STATUSES).withMessage("Invalid status."),

  body("priority").optional().isIn(LEAD_PRIORITIES).withMessage("Invalid priority."),

  body("lostReason").optional().trim().isLength({ max: 500 }),
];

export const assignLeadValidator = [
  body("assignedToId")
    .custom((value) => value === null || typeof value === "string")
    .withMessage("assignedToId must be a string or null."),
];

export const createLeadNoteValidator = [
  body("body")
    .trim()
    .notEmpty()
    .withMessage("Note text is required.")
    .isLength({ max: 2000 }),
];

import { body, param } from "express-validator";

import { TenantRole } from "../generated/prisma/enums.js";

// STAFF is deliberately excluded — it's kept in the enum for backward
// Postgres compatibility only (see schema.prisma), never assigned going
// forward. See ADR-0036.
const ASSIGNABLE_TENANT_ROLES = Object.values(TenantRole).filter((role) => role !== "STAFF");
const STAFF_SCOPES = ["ORGANIZATION", "RESTAURANT", "BRANCH"] as const;

export const userIdParamValidator = [
  param("userId").notEmpty().withMessage("User ID is required."),
];

export const upsertStaffMembershipValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required.").normalizeEmail(),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters."),

  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),

  body("tenantRole").isIn(ASSIGNABLE_TENANT_ROLES).withMessage("Invalid tenant role."),

  body("scope").isIn(STAFF_SCOPES).withMessage("Invalid scope."),

  body("restaurantId").optional().notEmpty().withMessage("Invalid restaurantId."),

  body("branchId").optional().notEmpty().withMessage("Invalid branchId."),
];

export const upsertStaffMembershipForRestaurantValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required.").normalizeEmail(),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters."),

  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),

  body("tenantRole").isIn(ASSIGNABLE_TENANT_ROLES).withMessage("Invalid tenant role."),

  body("branchId").optional().notEmpty().withMessage("Invalid branchId."),
];

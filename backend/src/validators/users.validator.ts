import { body, param } from "express-validator";

export const userIdParamValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("User ID is required"),
];

export const createUserValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("roles")
    .isArray({ min: 1 })
    .withMessage("At least one role is required"),

  body("roles.*")
    .isString()
    .withMessage("Each role must be a string"),
];

export const updateUserValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("User ID is required"),

  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];

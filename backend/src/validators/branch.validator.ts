import { body, param } from "express-validator";

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const branchIdParamValidator = [
  param("branchId").notEmpty().withMessage("Branch ID is required."),
];

export const createBranchValidator = [
  body("name").trim().notEmpty().isLength({ max: 200 }).withMessage("Name is required."),
];

export const updateBranchValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Name cannot be empty."),
];

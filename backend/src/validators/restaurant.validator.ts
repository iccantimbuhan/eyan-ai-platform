import { body, param } from "express-validator";

export const organizationIdParamValidator = [
  param("organizationId").notEmpty().withMessage("Organization ID is required."),
];

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const createRestaurantValidator = [
  body("name").trim().notEmpty().isLength({ max: 200 }).withMessage("Name is required."),
];

export const updateRestaurantValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Name cannot be empty."),
];

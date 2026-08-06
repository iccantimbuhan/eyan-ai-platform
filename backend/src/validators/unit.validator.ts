import { body, param } from "express-validator";

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const unitIdParamValidator = [
  param("unitId").notEmpty().withMessage("Unit ID is required."),
];

export const createUnitValidator = [
  body("name").trim().notEmpty().isLength({ max: 100 }).withMessage("Name is required."),

  body("abbreviation")
    .trim()
    .notEmpty()
    .isLength({ max: 20 })
    .withMessage("Abbreviation is required."),
];

export const updateUnitValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage("Name cannot be empty."),

  body("abbreviation")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 20 })
    .withMessage("Abbreviation cannot be empty."),
];

import { body, param } from "express-validator";

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const supplierIdParamValidator = [
  param("supplierId").notEmpty().withMessage("Supplier ID is required."),
];

export const createSupplierValidator = [
  body("name").trim().notEmpty().isLength({ max: 200 }).withMessage("Name is required."),

  body("phone").optional().trim().isLength({ max: 50 }),

  body("email").optional().trim().isEmail().withMessage("Invalid email.").normalizeEmail(),

  body("notes").optional().trim().isLength({ max: 1000 }),
];

export const updateSupplierValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Name cannot be empty."),

  body("phone").optional().trim().isLength({ max: 50 }),

  body("email").optional().trim().isEmail().withMessage("Invalid email.").normalizeEmail(),

  body("notes").optional().trim().isLength({ max: 1000 }),
];

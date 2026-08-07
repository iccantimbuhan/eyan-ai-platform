import { body, param } from "express-validator";

export const salesChannelIdParamValidator = [
  param("salesChannelId").notEmpty().withMessage("Sales channel ID is required."),
];

export const upsertSalesChannelMenuItemValidator = [
  body("price")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Price must be zero or greater."),
  body("available").optional().isBoolean().withMessage("Available must be true or false."),
];

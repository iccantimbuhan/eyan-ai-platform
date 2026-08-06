import { body, param, query } from "express-validator";

import { MenuItemStatus } from "../generated/prisma/enums.js";

const MENU_ITEM_STATUSES = Object.values(MenuItemStatus);

export const restaurantIdParamValidator = [
  param("restaurantId").notEmpty().withMessage("Restaurant ID is required."),
];

export const itemIdParamValidator = [
  param("itemId").notEmpty().withMessage("Menu item ID is required."),
];

export const listMenuItemsValidator = [
  query("menuCategoryId").optional().notEmpty().withMessage("Invalid menuCategoryId."),
];

export const createMenuItemValidator = [
  body("menuCategoryId").notEmpty().withMessage("Menu category is required."),

  body("name").trim().notEmpty().isLength({ max: 200 }).withMessage("Name is required."),

  body("description").optional().trim().isLength({ max: 1000 }),

  body("price").isFloat({ min: 0 }).withMessage("Price must be 0 or greater."),

  body("imagePath").optional().trim().isLength({ max: 500 }),

  body("available").optional().isBoolean().withMessage("Available must be a boolean."),

  body("status").optional().isIn(MENU_ITEM_STATUSES).withMessage("Invalid status."),
];

export const updateMenuItemValidator = [
  body("menuCategoryId").optional().notEmpty().withMessage("Invalid menu category."),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage("Name cannot be empty."),

  body("description").optional().trim().isLength({ max: 1000 }),

  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be 0 or greater."),

  body("imagePath").optional().trim().isLength({ max: 500 }),

  body("available").optional().isBoolean().withMessage("Available must be a boolean."),

  body("status").optional().isIn(MENU_ITEM_STATUSES).withMessage("Invalid status."),
];

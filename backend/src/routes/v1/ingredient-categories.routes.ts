import { Router, type Router as ExpressRouter } from "express";

import { IngredientCategoryController } from "../../controllers/ingredient-category.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireIngredientCategoryAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  ingredientCategoryIdParamValidator,
  updateIngredientCategoryValidator,
} from "../../validators/ingredient-category.validator.js";

// Mounted at /api/v1/ingredient-categories — single-category operations by
// its own id. Creating/listing categories happens under a Restaurant
// instead, see restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:ingredientCategoryId",
  ingredientCategoryIdParamValidator,
  validate,
  requireIngredientCategoryAccess(),
  IngredientCategoryController.getOne
);

router.patch(
  "/:ingredientCategoryId",
  ingredientCategoryIdParamValidator,
  updateIngredientCategoryValidator,
  validate,
  requireIngredientCategoryAccess(),
  IngredientCategoryController.update
);

router.delete(
  "/:ingredientCategoryId",
  ingredientCategoryIdParamValidator,
  validate,
  requireIngredientCategoryAccess(),
  IngredientCategoryController.remove
);

export default router;

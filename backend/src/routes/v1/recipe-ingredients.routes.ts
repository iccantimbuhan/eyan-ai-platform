import { Router, type Router as ExpressRouter } from "express";

import { RecipeIngredientController } from "../../controllers/recipe-ingredient.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireRecipeIngredientAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  recipeIngredientIdParamValidator,
  updateRecipeIngredientValidator,
} from "../../validators/recipe-ingredient.validator.js";

// Mounted at /api/v1/recipe-ingredients — single-line operations by its own
// id. Creating/listing lines happens under a Recipe instead, see
// recipes.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:recipeIngredientId",
  recipeIngredientIdParamValidator,
  validate,
  requireRecipeIngredientAccess(),
  RecipeIngredientController.getOne
);

router.patch(
  "/:recipeIngredientId",
  recipeIngredientIdParamValidator,
  updateRecipeIngredientValidator,
  validate,
  requireRecipeIngredientAccess(),
  RecipeIngredientController.update
);

router.delete(
  "/:recipeIngredientId",
  recipeIngredientIdParamValidator,
  validate,
  requireRecipeIngredientAccess(),
  RecipeIngredientController.remove
);

export default router;

import { Router, type Router as ExpressRouter } from "express";

import { RecipeController } from "../../controllers/recipe.controller.js";
import { RecipeIngredientController } from "../../controllers/recipe-ingredient.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireRecipeAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import { recipeIdParamValidator, updateRecipeValidator } from "../../validators/recipe.validator.js";
import {
  createRecipeIngredientValidator,
  recipeIdParamValidator as recipeIdForIngredientsParamValidator,
} from "../../validators/recipe-ingredient.validator.js";

// Mounted at /api/v1/recipes — single-recipe operations by its own id, plus
// list/create of its ingredient lines (mirrors restaurants.routes.ts
// holding menu-items create/list, and menu-items.routes.ts holding single-
// item ops). Creating/listing recipes themselves happens under a
// Restaurant instead, see restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:recipeId",
  recipeIdParamValidator,
  validate,
  requireRecipeAccess(),
  RecipeController.getOne
);

router.patch(
  "/:recipeId",
  recipeIdParamValidator,
  updateRecipeValidator,
  validate,
  requireRecipeAccess(),
  RecipeController.update
);

router.delete(
  "/:recipeId",
  recipeIdParamValidator,
  validate,
  requireRecipeAccess(),
  RecipeController.remove
);

router.get(
  "/:recipeId/ingredients",
  recipeIdForIngredientsParamValidator,
  validate,
  requireRecipeAccess(),
  RecipeIngredientController.list
);

router.post(
  "/:recipeId/ingredients",
  recipeIdForIngredientsParamValidator,
  createRecipeIngredientValidator,
  validate,
  requireRecipeAccess(),
  RecipeIngredientController.create
);

export default router;

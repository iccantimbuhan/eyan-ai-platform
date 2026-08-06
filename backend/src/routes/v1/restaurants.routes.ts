import { Router, type Router as ExpressRouter } from "express";

import { RestaurantController } from "../../controllers/restaurant.controller.js";
import { BranchController } from "../../controllers/branch.controller.js";
import { MenuCategoryController } from "../../controllers/menu-category.controller.js";
import { MenuItemController } from "../../controllers/menu-item.controller.js";
import { UnitController } from "../../controllers/unit.controller.js";
import { IngredientCategoryController } from "../../controllers/ingredient-category.controller.js";
import { SupplierController } from "../../controllers/supplier.controller.js";
import { IngredientController } from "../../controllers/ingredient.controller.js";
import { RecipeController } from "../../controllers/recipe.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireRestaurantAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  restaurantIdParamValidator,
  updateRestaurantValidator,
} from "../../validators/restaurant.validator.js";
import { createBranchValidator } from "../../validators/branch.validator.js";
import { createMenuCategoryValidator } from "../../validators/menu-category.validator.js";
import {
  createMenuItemValidator,
  listMenuItemsValidator,
} from "../../validators/menu-item.validator.js";
import { createUnitValidator } from "../../validators/unit.validator.js";
import { createIngredientCategoryValidator } from "../../validators/ingredient-category.validator.js";
import { createSupplierValidator } from "../../validators/supplier.validator.js";
import { createIngredientValidator } from "../../validators/ingredient.validator.js";
import { createRecipeValidator } from "../../validators/recipe.validator.js";

// Mounted at /api/v1/restaurants. Every route here is scoped by
// :restaurantId and guarded by requireRestaurantAccess — this is also
// where Branch/MenuCategory/MenuItem creation and listing live, since
// those are always reached "under a Restaurant" (see .context/restaurant.md
// ownership model). Single-resource Branch/MenuCategory/MenuItem
// operations (get/update/delete by their own id) live in their own route
// files, guarded by their own tenant-access middleware.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:restaurantId",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  RestaurantController.getOne
);

router.patch(
  "/:restaurantId",
  restaurantIdParamValidator,
  updateRestaurantValidator,
  validate,
  requireRestaurantAccess(),
  RestaurantController.update
);

router.delete(
  "/:restaurantId",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  RestaurantController.remove
);

router.get(
  "/:restaurantId/branches",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  BranchController.list
);

router.post(
  "/:restaurantId/branches",
  restaurantIdParamValidator,
  createBranchValidator,
  validate,
  requireRestaurantAccess(),
  BranchController.create
);

router.get(
  "/:restaurantId/menu-categories",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  MenuCategoryController.list
);

router.post(
  "/:restaurantId/menu-categories",
  restaurantIdParamValidator,
  createMenuCategoryValidator,
  validate,
  requireRestaurantAccess(),
  MenuCategoryController.create
);

router.get(
  "/:restaurantId/menu-items",
  restaurantIdParamValidator,
  listMenuItemsValidator,
  validate,
  requireRestaurantAccess(),
  MenuItemController.list
);

router.post(
  "/:restaurantId/menu-items",
  restaurantIdParamValidator,
  createMenuItemValidator,
  validate,
  requireRestaurantAccess(),
  MenuItemController.create
);

// Restaurant Product Foundation (Sprint 1.3) — Unit, Ingredient Category,
// Supplier, Ingredient, and Recipe all follow the same create/list-under-
// Restaurant, single-op-under-own-route split as Branch/MenuCategory/
// MenuItem above.
router.get(
  "/:restaurantId/units",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  UnitController.list
);

router.post(
  "/:restaurantId/units",
  restaurantIdParamValidator,
  createUnitValidator,
  validate,
  requireRestaurantAccess(),
  UnitController.create
);

router.get(
  "/:restaurantId/ingredient-categories",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  IngredientCategoryController.list
);

router.post(
  "/:restaurantId/ingredient-categories",
  restaurantIdParamValidator,
  createIngredientCategoryValidator,
  validate,
  requireRestaurantAccess(),
  IngredientCategoryController.create
);

router.get(
  "/:restaurantId/suppliers",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  SupplierController.list
);

router.post(
  "/:restaurantId/suppliers",
  restaurantIdParamValidator,
  createSupplierValidator,
  validate,
  requireRestaurantAccess(),
  SupplierController.create
);

router.get(
  "/:restaurantId/ingredients",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  IngredientController.list
);

router.post(
  "/:restaurantId/ingredients",
  restaurantIdParamValidator,
  createIngredientValidator,
  validate,
  requireRestaurantAccess(),
  IngredientController.create
);

router.get(
  "/:restaurantId/recipes",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  RecipeController.list
);

router.post(
  "/:restaurantId/recipes",
  restaurantIdParamValidator,
  createRecipeValidator,
  validate,
  requireRestaurantAccess(),
  RecipeController.create
);

export default router;

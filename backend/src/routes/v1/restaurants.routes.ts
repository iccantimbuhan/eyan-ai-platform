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
import {
  PosSourceController,
  SalesCategoryController,
  SalesChannelController,
  SalesPaymentMethodController,
} from "../../controllers/sales-reference.controller.js";
import { SalesChannelMenuItemController } from "../../controllers/sales-channel-menu-item.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireRestaurantAccess, requireTenantRole } from "../../middleware/tenant.middleware.js";
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
import {
  createSalesPaymentMethodValidator,
  createSalesReferenceValidator,
  salesPaymentMethodIdParamValidator,
  updateSalesPaymentMethodValidator,
} from "../../validators/sales-reference.validator.js";

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

// Sales Foundation (Sprint 2C, ADR-0039) — SalesChannel/SalesPaymentMethod/
// SalesCategory are Restaurant-scoped configurable master lists, same
// posture as Unit above. Unlike Unit/Ingredient/etc., writes here require
// the Sales write-role policy (confirmed with the user) rather than being
// open to any Restaurant/Organization member — these are financial
// reference data, not general product-catalog config. No single-resource
// GET/PATCH/DELETE in this sprint (create+list only).
const SALES_WRITE_ROLES = ["OWNER", "MANAGER", "SUPERVISOR", "ACCOUNTANT"] as const;

router.get(
  "/:restaurantId/sales-channels",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  SalesChannelController.list
);

router.post(
  "/:restaurantId/sales-channels",
  restaurantIdParamValidator,
  createSalesReferenceValidator,
  validate,
  requireRestaurantAccess(),
  requireTenantRole(...SALES_WRITE_ROLES),
  SalesChannelController.create
);

router.get(
  "/:restaurantId/sales-payment-methods",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  SalesPaymentMethodController.list
);

router.post(
  "/:restaurantId/sales-payment-methods",
  restaurantIdParamValidator,
  createSalesPaymentMethodValidator,
  validate,
  requireRestaurantAccess(),
  requireTenantRole(...SALES_WRITE_ROLES),
  SalesPaymentMethodController.create
);

// ADR-0043 — the only single-resource reference-list write in this sprint:
// lets a manager retroactively flag an existing payment method as physical
// cash. Scope (the id actually belongs to :restaurantId) is checked in
// SalesPaymentMethodService.update, mirroring sales-entry.service.ts's own
// FK scope checks rather than a dedicated requireXAccess middleware.
router.patch(
  "/:restaurantId/sales-payment-methods/:id",
  restaurantIdParamValidator,
  salesPaymentMethodIdParamValidator,
  updateSalesPaymentMethodValidator,
  validate,
  requireRestaurantAccess(),
  requireTenantRole(...SALES_WRITE_ROLES),
  SalesPaymentMethodController.update
);

router.get(
  "/:restaurantId/sales-categories",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  SalesCategoryController.list
);

router.post(
  "/:restaurantId/sales-categories",
  restaurantIdParamValidator,
  createSalesReferenceValidator,
  validate,
  requireRestaurantAccess(),
  requireTenantRole(...SALES_WRITE_ROLES),
  SalesCategoryController.create
);

// POS Source / Sales Channel Flexibility — the physical/software POS
// terminal or report source, kept as its own Restaurant-scoped master list
// alongside Channel/Payment Method/Category. Deliberately never linked to
// SalesChannel here; the relationship between a POS source and the
// channels it reports is captured per SalesChannelEntry (see
// sales-entry.routes and PosSourceId on that model), so one restaurant can
// have a single POS covering every channel while another splits channels
// across multiple POS terminals, with no fixed mapping either way.
router.get(
  "/:restaurantId/sales-pos-sources",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  PosSourceController.list
);

router.post(
  "/:restaurantId/sales-pos-sources",
  restaurantIdParamValidator,
  createSalesReferenceValidator,
  validate,
  requireRestaurantAccess(),
  requireTenantRole(...SALES_WRITE_ROLES),
  PosSourceController.create
);

// Sprint 2B Prep — every channel-specific MenuItem price/availability
// override for this restaurant, read wholesale (same posture as the three
// reference lists above). Mutations (upsert/remove one override) live
// under menu-items.routes.ts, scoped by requireMenuItemAccess — this is
// only the restaurant-wide read.
router.get(
  "/:restaurantId/sales-channel-menu-items",
  restaurantIdParamValidator,
  validate,
  requireRestaurantAccess(),
  SalesChannelMenuItemController.listByRestaurant
);

export default router;

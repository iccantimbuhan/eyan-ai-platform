import { Router, type Router as ExpressRouter } from "express";

import { IngredientController } from "../../controllers/ingredient.controller.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireIngredientAccess } from "../../middleware/tenant.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";

import {
  ingredientIdParamValidator,
  updateIngredientValidator,
} from "../../validators/ingredient.validator.js";

// Mounted at /api/v1/ingredients — single-ingredient operations by its own
// id, including replacing its linked supplier set (part of the same PATCH
// body, mirroring roles.service.ts's replace-on-write permissions pattern).
// Creating/listing ingredients happens under a Restaurant instead, see
// restaurants.routes.ts.
const router: ExpressRouter = Router();

router.use(authenticate, requirePermission("restaurant"));

router.get(
  "/:ingredientId",
  ingredientIdParamValidator,
  validate,
  requireIngredientAccess(),
  IngredientController.getOne
);

router.patch(
  "/:ingredientId",
  ingredientIdParamValidator,
  updateIngredientValidator,
  validate,
  requireIngredientAccess(),
  IngredientController.update
);

router.delete(
  "/:ingredientId",
  ingredientIdParamValidator,
  validate,
  requireIngredientAccess(),
  IngredientController.remove
);

export default router;

import { ApiError } from "./api-error.js";

// Thrown when an Ingredient's ingredientCategoryId, or a Recipe Ingredient's
// ingredientId/unitId, doesn't belong to the restaurant it's being
// created/moved under — the request already passed requireRestaurantAccess/
// requireRecipeAccess for the parent scope, so without this check a client
// could attach a row to a category/ingredient/unit under a *different*
// Restaurant just by guessing its id. Mirrors MenuCategoryMismatchError.
export class RestaurantProductScopeMismatchError extends ApiError {
  constructor(message = "This resource does not belong to the given restaurant.") {
    super(400, message);
    this.name = "RestaurantProductScopeMismatchError";
  }
}

// Recipe.menuItemId is unique — a MenuItem can own at most one Recipe.
export class MenuItemAlreadyHasRecipeError extends ApiError {
  constructor(message = "This menu item already has a recipe.") {
    super(409, message);
    this.name = "MenuItemAlreadyHasRecipeError";
  }
}

import { ApiError } from "./api-error.js";

// Thrown when a MenuItem's menuCategoryId doesn't belong to the restaurant
// it's being created/moved under — the request already passed
// requireRestaurantAccess for that restaurantId, so without this check a
// client could attach an item to a category under a *different* Restaurant
// (including one they have no access to) just by guessing its id.
export class MenuCategoryMismatchError extends ApiError {
  constructor(message = "This menu category does not belong to the given restaurant.") {
    super(400, message);
    this.name = "MenuCategoryMismatchError";
  }
}

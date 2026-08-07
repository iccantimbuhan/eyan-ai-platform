import { ApiError } from "./api-error.js";

// Thrown when an InventoryItem's ingredientId/unitId doesn't belong to the
// same Restaurant that owns the target Branch — the request already passed
// requireBranchAccess for the parent scope, so without this check a client
// could attach stock to an Ingredient/Unit under a *different* Restaurant
// just by guessing its id. Mirrors RestaurantProductScopeMismatchError.
export class InventoryScopeMismatchError extends ApiError {
  constructor(message = "This resource does not belong to the restaurant that owns the given branch.") {
    super(400, message);
    this.name = "InventoryScopeMismatchError";
  }
}

// InventoryItem.@@unique([branchId, ingredientId]) — one stock record per
// Ingredient per Branch.
export class InventoryItemAlreadyExistsError extends ApiError {
  constructor(message = "An inventory item already exists for this ingredient at this branch.") {
    super(409, message);
    this.name = "InventoryItemAlreadyExistsError";
  }
}

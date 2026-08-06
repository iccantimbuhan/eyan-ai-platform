import { recipeRepository, RecipeRepository } from "../repositories/recipe.repository.js";
import {
  menuItemRepository as defaultMenuItemRepository,
  MenuItemRepository,
} from "../repositories/menu-item.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import {
  MenuItemAlreadyHasRecipeError,
  RestaurantProductScopeMismatchError,
} from "../errors/restaurant-product.error.js";
import { mapRecipeToResponse } from "../dto/recipe.mapper.js";
import type { CreateRecipeDto, UpdateRecipeDto } from "../dto/recipe.dto.js";

export class RecipeService {
  constructor(
    private readonly repository: RecipeRepository = recipeRepository,
    private readonly menuItemRepository: MenuItemRepository = defaultMenuItemRepository
  ) {}

  async list(restaurantId: string) {
    const recipes = await this.repository.findManyByRestaurantId(restaurantId);
    return recipes.map(mapRecipeToResponse);
  }

  async getById(id: string) {
    const recipe = await this.repository.findById(id);

    if (!recipe) {
      throw new NotFoundError("Recipe not found.");
    }

    return mapRecipeToResponse(recipe);
  }

  // Verifies the target menu item actually belongs to this restaurant — the
  // route already passed requireRestaurantAccess for restaurantId, but
  // menuItemId is client-supplied. Mirrors MenuItemService's
  // assertCategoryBelongsToRestaurant.
  private async assertMenuItemBelongsToRestaurant(restaurantId: string, menuItemId: string) {
    const menuItem = await this.menuItemRepository.findById(menuItemId);

    if (!menuItem || menuItem.restaurantId !== restaurantId) {
      throw new RestaurantProductScopeMismatchError(
        "This menu item does not belong to the given restaurant."
      );
    }
  }

  async create(restaurantId: string, data: CreateRecipeDto) {
    await this.assertMenuItemBelongsToRestaurant(restaurantId, data.menuItemId);

    const existing = await this.repository.findByMenuItemId(data.menuItemId);
    if (existing) {
      throw new MenuItemAlreadyHasRecipeError();
    }

    const recipe = await this.repository.create({
      restaurantId,
      menuItemId: data.menuItemId,
      notes: data.notes,
    });

    return mapRecipeToResponse(recipe);
  }

  async update(id: string, data: UpdateRecipeDto) {
    await this.getById(id);

    const recipe = await this.repository.update(id, { notes: data.notes });

    return mapRecipeToResponse(recipe);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const recipeService = new RecipeService();

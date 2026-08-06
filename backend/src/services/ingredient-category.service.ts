import {
  ingredientCategoryRepository,
  IngredientCategoryRepository,
} from "../repositories/ingredient-category.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { mapIngredientCategoryToResponse } from "../dto/ingredient-category.mapper.js";
import type {
  CreateIngredientCategoryDto,
  UpdateIngredientCategoryDto,
} from "../dto/ingredient-category.dto.js";

export class IngredientCategoryService {
  constructor(
    private readonly repository: IngredientCategoryRepository = ingredientCategoryRepository
  ) {}

  async list(restaurantId: string) {
    const categories = await this.repository.findManyByRestaurantId(restaurantId);
    return categories.map(mapIngredientCategoryToResponse);
  }

  async getById(id: string) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundError("Ingredient category not found.");
    }

    return mapIngredientCategoryToResponse(category);
  }

  async create(restaurantId: string, data: CreateIngredientCategoryDto) {
    const category = await this.repository.create({
      restaurantId,
      name: data.name,
    });

    return mapIngredientCategoryToResponse(category);
  }

  async update(id: string, data: UpdateIngredientCategoryDto) {
    await this.getById(id);

    const category = await this.repository.update(id, { name: data.name });

    return mapIngredientCategoryToResponse(category);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const ingredientCategoryService = new IngredientCategoryService();

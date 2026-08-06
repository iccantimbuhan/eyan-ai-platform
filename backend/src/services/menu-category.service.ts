import {
  menuCategoryRepository,
  MenuCategoryRepository,
} from "../repositories/menu-category.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { mapMenuCategoryToResponse } from "../dto/menu-category.mapper.js";
import type { CreateMenuCategoryDto, UpdateMenuCategoryDto } from "../dto/menu-category.dto.js";

export class MenuCategoryService {
  constructor(
    private readonly repository: MenuCategoryRepository = menuCategoryRepository
  ) {}

  async list(restaurantId: string) {
    const categories = await this.repository.findManyByRestaurantId(restaurantId);
    return categories.map(mapMenuCategoryToResponse);
  }

  async getById(id: string) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundError("Menu category not found.");
    }

    return mapMenuCategoryToResponse(category);
  }

  async create(restaurantId: string, data: CreateMenuCategoryDto) {
    const category = await this.repository.create({
      restaurantId,
      name: data.name,
      displayOrder: data.displayOrder,
    });

    return mapMenuCategoryToResponse(category);
  }

  async update(id: string, data: UpdateMenuCategoryDto) {
    await this.getById(id);

    const category = await this.repository.update(id, {
      name: data.name,
      displayOrder: data.displayOrder,
    });

    return mapMenuCategoryToResponse(category);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const menuCategoryService = new MenuCategoryService();

import { menuItemRepository, MenuItemRepository } from "../repositories/menu-item.repository.js";
import {
  menuCategoryRepository,
  MenuCategoryRepository,
} from "../repositories/menu-category.repository.js";
import { NotFoundError } from "../errors/auth.error.js";
import { MenuCategoryMismatchError } from "../errors/restaurant.error.js";
import { mapMenuItemToResponse } from "../dto/menu-item.mapper.js";
import type { CreateMenuItemDto, UpdateMenuItemDto } from "../dto/menu-item.dto.js";

export class MenuItemService {
  constructor(
    private readonly repository: MenuItemRepository = menuItemRepository,
    private readonly categoryRepository: MenuCategoryRepository = menuCategoryRepository
  ) {}

  async list(restaurantId: string, menuCategoryId?: string) {
    const items = await this.repository.findManyByRestaurantId(restaurantId, menuCategoryId);
    return items.map(mapMenuItemToResponse);
  }

  async getById(id: string) {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new NotFoundError("Menu item not found.");
    }

    return mapMenuItemToResponse(item);
  }

  // Verifies the target category actually belongs to this restaurant — the
  // route already passed requireRestaurantAccess for restaurantId, but
  // menuCategoryId is client-supplied and could otherwise point at a
  // category under a different Restaurant. See errors/restaurant.error.ts.
  private async assertCategoryBelongsToRestaurant(restaurantId: string, menuCategoryId: string) {
    const category = await this.categoryRepository.findById(menuCategoryId);

    if (!category || category.restaurantId !== restaurantId) {
      throw new MenuCategoryMismatchError();
    }
  }

  async create(restaurantId: string, data: CreateMenuItemDto) {
    await this.assertCategoryBelongsToRestaurant(restaurantId, data.menuCategoryId);

    const item = await this.repository.create({
      restaurantId,
      menuCategoryId: data.menuCategoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      imagePath: data.imagePath,
      available: data.available,
      status: data.status,
    });

    return mapMenuItemToResponse(item);
  }

  async update(id: string, data: UpdateMenuItemDto) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundError("Menu item not found.");
    }

    if (data.menuCategoryId) {
      await this.assertCategoryBelongsToRestaurant(existing.restaurantId, data.menuCategoryId);
    }

    const item = await this.repository.update(id, {
      menuCategoryId: data.menuCategoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      imagePath: data.imagePath,
      available: data.available,
      status: data.status,
    });

    return mapMenuItemToResponse(item);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.repository.delete(id);
  }
}

export const menuItemService = new MenuItemService();

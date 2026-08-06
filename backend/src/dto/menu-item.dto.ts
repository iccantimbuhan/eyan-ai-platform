import type { MenuItemStatus } from "../generated/prisma/enums.js";

export interface CreateMenuItemDto {
  menuCategoryId: string;
  name: string;
  description?: string;
  price: string;
  imagePath?: string;
  available?: boolean;
  status?: MenuItemStatus;
}

export interface UpdateMenuItemDto {
  menuCategoryId?: string;
  name?: string;
  description?: string;
  price?: string;
  imagePath?: string;
  available?: boolean;
  status?: MenuItemStatus;
}

export interface ListMenuItemsQueryDto {
  menuCategoryId?: string;
}

export interface MenuItemResponseDto {
  id: string;
  restaurantId: string;
  menuCategoryId: string;
  name: string;
  description: string | null;
  price: string;
  imagePath: string | null;
  available: boolean;
  status: MenuItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

import { prisma } from "../lib/prisma.js";
import type { MenuItemStatus } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateMenuItemData {
  restaurantId: string;
  menuCategoryId: string;
  name: string;
  description?: string | null;
  price: Prisma.Decimal | string;
  imagePath?: string | null;
  available?: boolean;
  status?: MenuItemStatus;
}

export interface UpdateMenuItemData {
  menuCategoryId?: string;
  name?: string;
  description?: string | null;
  price?: Prisma.Decimal | string;
  imagePath?: string | null;
  available?: boolean;
  status?: MenuItemStatus;
}

export class MenuItemRepository {
  async findById(id: string) {
    return prisma.menuItem.findUnique({ where: { id } });
  }

  async findManyByRestaurantId(restaurantId: string, menuCategoryId?: string) {
    return prisma.menuItem.findMany({
      where: {
        restaurantId,
        ...(menuCategoryId ? { menuCategoryId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(data: CreateMenuItemData) {
    return prisma.menuItem.create({ data });
  }

  async update(id: string, data: UpdateMenuItemData) {
    return prisma.menuItem.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.menuItem.delete({ where: { id } });
  }
}

export const menuItemRepository = new MenuItemRepository();

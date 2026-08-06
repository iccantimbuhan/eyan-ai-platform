import type { MenuCategory } from "../generated/prisma/client.js";
import type { MenuCategoryResponseDto } from "./menu-category.dto.js";

export function mapMenuCategoryToResponse(row: MenuCategory): MenuCategoryResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

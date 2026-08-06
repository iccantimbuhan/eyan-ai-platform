import type { MenuItem } from "../generated/prisma/client.js";
import type { MenuItemResponseDto } from "./menu-item.dto.js";

// Decimal -> string boundary conversion happens only here, same convention
// as finance-expense.mapper.ts: .toFixed(2), never .toString(), so a price
// of "12.50" never round-trips as "12.5".
export function mapMenuItemToResponse(row: MenuItem): MenuItemResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    menuCategoryId: row.menuCategoryId,
    name: row.name,
    description: row.description,
    price: row.price.toFixed(2),
    imagePath: row.imagePath,
    available: row.available,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

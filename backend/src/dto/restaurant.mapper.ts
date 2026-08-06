import type { Restaurant } from "../generated/prisma/client.js";
import type { RestaurantResponseDto } from "./restaurant.dto.js";

export function mapRestaurantToResponse(row: Restaurant): RestaurantResponseDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

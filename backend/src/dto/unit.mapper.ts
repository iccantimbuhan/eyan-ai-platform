import type { Unit } from "../generated/prisma/client.js";
import type { UnitResponseDto } from "./unit.dto.js";

export function mapUnitToResponse(row: Unit): UnitResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    abbreviation: row.abbreviation,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

import type { Branch } from "../generated/prisma/client.js";
import type { BranchResponseDto } from "./branch.dto.js";

export function mapBranchToResponse(row: Branch): BranchResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

import type { Supplier } from "../generated/prisma/client.js";
import type { SupplierResponseDto } from "./supplier.dto.js";

export function mapSupplierToResponse(row: Supplier): SupplierResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

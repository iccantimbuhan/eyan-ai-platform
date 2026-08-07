import type { SalesReferenceResponseDto } from "./sales-reference.dto.js";

interface SalesReferenceRow {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// One shared mapper for all three master-list types (SalesChannel/
// SalesPaymentMethod/SalesCategory) — identical shape, see
// sales-reference.repository.ts's own grouping rationale.
export function mapSalesReferenceToResponse(row: SalesReferenceRow): SalesReferenceResponseDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

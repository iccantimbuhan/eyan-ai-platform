export interface CreateSalesReferenceDto {
  name: string;
}

export interface SalesReferenceResponseDto {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// SalesPaymentMethod is the only one of the four reference lists with a
// mutable field beyond name (ADR-0043) — its own DTOs rather than widening
// the shared shape for the other three, which stay create/list-only.
export interface CreateSalesPaymentMethodDto extends CreateSalesReferenceDto {
  isCashEquivalent?: boolean;
}

export interface UpdateSalesPaymentMethodDto {
  isCashEquivalent: boolean;
}

export interface SalesPaymentMethodResponseDto extends SalesReferenceResponseDto {
  isCashEquivalent: boolean;
}

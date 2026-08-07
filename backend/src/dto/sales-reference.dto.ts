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

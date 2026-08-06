export interface CreateRestaurantDto {
  name: string;
}

export interface UpdateRestaurantDto {
  name?: string;
}

export interface RestaurantResponseDto {
  id: string;
  organizationId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

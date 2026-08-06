export interface CreateMenuCategoryDto {
  name: string;
  displayOrder?: number;
}

export interface UpdateMenuCategoryDto {
  name?: string;
  displayOrder?: number;
}

export interface MenuCategoryResponseDto {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

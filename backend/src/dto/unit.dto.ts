export interface CreateUnitDto {
  name: string;
  abbreviation: string;
}

export interface UpdateUnitDto {
  name?: string;
  abbreviation?: string;
}

export interface UnitResponseDto {
  id: string;
  restaurantId: string;
  name: string;
  abbreviation: string;
  createdAt: Date;
  updatedAt: Date;
}

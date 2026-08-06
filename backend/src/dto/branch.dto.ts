export interface CreateBranchDto {
  name: string;
}

export interface UpdateBranchDto {
  name?: string;
}

export interface BranchResponseDto {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

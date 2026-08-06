export interface CreateSupplierDto {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierDto {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface SupplierResponseDto {
  id: string;
  restaurantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

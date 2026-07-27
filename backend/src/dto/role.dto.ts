export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  userCount: number;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  isActive?: boolean;
  permissions?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  permissions?: string[];
}

export interface UpdateRolePermissionsDto {
  permissions: string[];
}

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;

  // Backward compatibility
  role: string;

  // RBAC
  roles: string[];
  permissions: string[];

  // Account status
  isActive: boolean;
  emailVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface ListUsersQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  roles: string[];
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

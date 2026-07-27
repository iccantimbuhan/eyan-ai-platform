export interface User {
  id: string;
  name: string;
  email: string;

  role: string;
  roles: string[];
  permissions: string[];

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
}

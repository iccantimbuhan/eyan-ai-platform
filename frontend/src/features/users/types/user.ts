export interface User {
  id: string
  name: string
  email: string

  /**
   * Primary role
   */
  role: string

  /**
   * All assigned roles
   */
  roles: string[]

  permissions: string[]

  isActive: boolean
  emailVerified: boolean

  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  page: number
  limit: number
  total: number
}

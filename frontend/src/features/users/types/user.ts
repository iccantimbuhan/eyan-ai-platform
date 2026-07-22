export interface User {
  id: string
  name: string
  email: string

  roles: string[]
  permissions: string[]

  isActive: boolean

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

import { api } from '@/services/api'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  name: string
  email: string

  // Backward compatibility
  role: string

  // RBAC
  roles: string[]
  permissions: string[]

  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  success: boolean
  data: {
    user: AuthUser
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
}

export async function login(payload: LoginRequest) {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)

  return data.data
}

export async function me() {
  const { data } = await api.get('/auth/me')
  return data.data
}

export async function logout() {
  const { data } = await api.post('/auth/logout')
  return data.data
}

export async function refresh(refreshToken: string) {
  const { data } = await api.post('/auth/refresh', {
    refreshToken,
  })

  return data.data
}

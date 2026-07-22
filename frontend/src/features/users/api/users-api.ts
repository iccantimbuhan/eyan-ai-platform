import { api } from '@/services/api'
import type { ApiResponse, User } from '../types/user'

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<ApiResponse<User[]>>('/users')
  return data.data
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<ApiResponse<User>>(`/users/${id}`)
  return data.data
}

export async function createUser(payload: {
  name: string
  email: string
  password: string
  roles: string[]
}) {
  const { data } = await api.post('/users', payload)
  return data
}

export async function updateUser(
  id: string,
  payload: Partial<{
    name: string
    email: string
    roles: string[]
    isActive: boolean
  }>
) {
  const { data } = await api.patch(`/users/${id}`, payload)
  return data
}

export async function deleteUser(id: string) {
  const { data } = await api.delete(`/users/${id}`)
  return data
}

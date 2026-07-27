import { api } from '@/services/api'
import type { RoleFormValues } from '../schemas/role-schema'
import type { ApiResponse, Role } from '../types/role'

export async function getRoles(): Promise<Role[]> {
  const { data } = await api.get<ApiResponse<Role[]>>('/roles')
  return data.data
}
export async function getPermissions() {
  const { data } =
    await api.get<
      ApiResponse<{ id: string; name: string; description: string | null }[]>
    >('/permissions')
  return data.data
}
export async function createRole(payload: RoleFormValues) {
  const { data } = await api.post<ApiResponse<Role>>('/roles', payload)
  return data.data
}
export async function updateRole(
  id: string,
  payload: Omit<RoleFormValues, 'permissions'>
) {
  const { data } = await api.patch<ApiResponse<Role>>(`/roles/${id}`, payload)
  return data.data
}
export async function updateRolePermissions(id: string, permissions: string[]) {
  const { data } = await api.patch<ApiResponse<Role>>(
    `/roles/${id}/permissions`,
    { permissions }
  )
  return data.data
}
export async function deleteRole(id: string) {
  await api.delete(`/roles/${id}`)
}

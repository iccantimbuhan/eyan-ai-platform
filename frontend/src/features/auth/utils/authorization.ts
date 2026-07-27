import { useAuthStore } from '@/stores/auth-store'

export function hasRole(role: string): boolean {
  const user = useAuthStore.getState().auth.user

  if (!user) return false

  return user.roles.includes(role)
}

export function hasAnyRole(roles: string[]): boolean {
  const user = useAuthStore.getState().auth.user

  if (!user) return false

  return roles.some((role) => user.roles.includes(role))
}

export function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().auth.user

  if (!user) return false

  return user.permissions.includes(permission)
}

export function hasAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore.getState().auth.user

  if (!user) return false

  return permissions.some((permission) => user.permissions.includes(permission))
}

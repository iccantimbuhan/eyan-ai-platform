import { useAuthStore } from '@/stores/auth-store'

export function useCan() {
  const permissions = useAuthStore(
    (state) => state.auth.user?.permissions ?? []
  )

  return (permission?: string) => {
    if (!permission) return true

    return permissions.includes(permission)
  }
}

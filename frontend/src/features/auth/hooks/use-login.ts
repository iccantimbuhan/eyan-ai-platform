import { useAuthStore } from '@/stores/auth-store'
import { login } from '../api/auth-api'

export function useLogin() {
  const { auth } = useAuthStore()

  return async (email: string, password: string) => {
    const result = await login({
      email,
      password,
    })

    auth.setTokens(result.tokens.accessToken, result.tokens.refreshToken)

    auth.setUser(result.user)

    return result.user
  }
}

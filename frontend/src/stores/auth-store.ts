import { create } from 'zustand'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'eyan_access_token'
const REFRESH_TOKEN = 'eyan_refresh_token'

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

interface AuthState {
  auth: {
    user: AuthUser | null

    accessToken: string
    refreshToken: string

    setUser: (user: AuthUser | null) => void

    setTokens: (accessToken: string, refreshToken: string) => void

    clearTokens: () => void

    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: null,

    accessToken: getCookie(ACCESS_TOKEN) || '',
    refreshToken: getCookie(REFRESH_TOKEN) || '',

    setUser: (user) =>
      set((state) => ({
        auth: {
          ...state.auth,
          user,
        },
      })),

    setTokens: (accessToken, refreshToken) => {
      setCookie(ACCESS_TOKEN, accessToken)
      setCookie(REFRESH_TOKEN, refreshToken)

      set((state) => ({
        auth: {
          ...state.auth,
          accessToken,
          refreshToken,
        },
      }))
    },

    clearTokens: () => {
      removeCookie(ACCESS_TOKEN)
      removeCookie(REFRESH_TOKEN)

      set((state) => ({
        auth: {
          ...state.auth,
          accessToken: '',
          refreshToken: '',
        },
      }))
    },

    reset: () => {
      removeCookie(ACCESS_TOKEN)
      removeCookie(REFRESH_TOKEN)

      set((state) => ({
        auth: {
          ...state.auth,
          user: null,
          accessToken: '',
          refreshToken: '',
        },
      }))
    },
  },
}))

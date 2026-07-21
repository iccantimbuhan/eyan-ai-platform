import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ForgotPassword } from '@/features/auth/forgot-password'

export const Route = createFileRoute('/(auth)/forgot-password')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    if (auth.accessToken) {
      throw redirect({
        to: '/',
      })
    }
  },

  component: ForgotPassword,
})

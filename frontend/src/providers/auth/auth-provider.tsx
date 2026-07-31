import { type ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { me } from '@/features/auth/api/auth-api'

interface Props {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  const { auth } = useAuthStore()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      // No token at all: nothing to restore (the /app/_authenticated
      // beforeLoad guard already redirects this case before this component
      // ever mounts — this is just a defensive fallback).
      //
      // A token AND a user already present means an explicit login just
      // happened in this session (useLogin() sets both synchronously,
      // including the Watch Presentation demo-login flow) — re-fetching
      // /auth/me here would be redundant and would flash "Restoring
      // session..." right as the first protected page/scene appears.
      // Restoration is still needed on a real reload of an /app/* page,
      // where auth.user is null in fresh JS memory even though the token
      // cookie survived.
      if (!auth.accessToken || auth.user) {
        setLoading(false)
        return
      }

      try {
        const user = await me()

        auth.setUser(user)
      } catch {
        auth.reset()
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        Restoring session...
      </div>
    )
  }

  return children
}

import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function importAuthStore() {
  const { useAuthStore } = await import('./auth-store')
  return useAuthStore
}

const sampleUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'user@example.com',

  // Backward compatibility
  role: 'Owner',

  // RBAC
  roles: ['Owner'],
  permissions: [],

  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    clearCookies()
    vi.resetModules()
  })

  it('starts with empty auth state when nothing is persisted', async () => {
    const useAuthStore = await importAuthStore()

    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.refreshToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
  })

  it('persists tokens so a new store instance reads them back', async () => {
    const useAuthStore = await importAuthStore()

    useAuthStore.getState().auth.setTokens('access-token', 'refresh-token')

    vi.resetModules()

    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe(
      'access-token'
    )

    expect(useAuthStoreAfterReload.getState().auth.refreshToken).toBe(
      'refresh-token'
    )
  })

  it('updates the signed-in user via setUser', async () => {
    const useAuthStore = await importAuthStore()

    useAuthStore.getState().auth.setUser(sampleUser)

    expect(useAuthStore.getState().auth.user).toEqual(sampleUser)
  })

  it('clearTokens removes persisted tokens', async () => {
    const useAuthStore = await importAuthStore()

    useAuthStore.getState().auth.setTokens('access-token', 'refresh-token')

    useAuthStore.getState().auth.clearTokens()

    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.refreshToken).toBe('')

    vi.resetModules()

    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe('')

    expect(useAuthStoreAfterReload.getState().auth.refreshToken).toBe('')
  })

  it('reset clears user and tokens', async () => {
    const useAuthStore = await importAuthStore()

    useAuthStore.getState().auth.setTokens('access-token', 'refresh-token')

    useAuthStore.getState().auth.setUser(sampleUser)

    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.refreshToken).toBe('')

    vi.resetModules()

    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.user).toBeNull()
    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe('')
    expect(useAuthStoreAfterReload.getState().auth.refreshToken).toBe('')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { useAuthStore } from '@/stores/auth-store'
import type { AutomationConnection } from '../types/automation'
import { ConnectionsPage } from './connections-page'

// ConnectionDialog/ConnectionActions each own their own form/mutation
// dependencies — stubbed here so this file only exercises ConnectionsPage's
// own orchestration (loading/error/empty states, permission-gated create
// button), matching AssetLibrary.test.tsx's "isolate the unit under test"
// convention.
vi.mock('./connection-dialog', () => ({
  ConnectionDialog: ({ open }: { open: boolean }) =>
    open ? <div>Connection Dialog</div> : null,
}))
vi.mock('./connection-actions', () => ({
  ConnectionActions: () => <div>actions</div>,
}))
vi.mock('@/features/errors/forbidden', () => ({
  ForbiddenError: () => <div>Forbidden</div>,
}))

const useConnectionsSpy = vi.fn()
let mockConnectionsReturn: {
  data: AutomationConnection[] | undefined
  isLoading: boolean
  error: unknown
}

vi.mock('../hooks/use-connections', () => ({
  useConnections: (...args: unknown[]) => {
    useConnectionsSpy(...args)
    return mockConnectionsReturn
  },
}))

function setConnectionsState(overrides: Partial<typeof mockConnectionsReturn> = {}) {
  mockConnectionsReturn = {
    data: [],
    isLoading: false,
    error: null,
    ...overrides,
  }
}

function setPermissions(permissions: string[]) {
  useAuthStore.getState().auth.setUser({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'Owner',
    roles: ['Owner'],
    permissions,
    createdAt: '',
    updatedAt: '',
  })
}

const connection: AutomationConnection = {
  id: 'conn-1',
  userId: 'user-1',
  provider: 'fake',
  label: 'My Fake Connection',
  status: 'ACTIVE',
  metadata: null,
  lastVerifiedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ConnectionsPage', () => {
  beforeEach(() => {
    setConnectionsState()
    setPermissions(['automation', 'automationcredentials'])
  })

  it('shows a forbidden screen when the caller lacks the "automation" permission', async () => {
    setPermissions([])

    const screen = await render(<ConnectionsPage />)

    await expect.element(screen.getByText('Forbidden')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', async () => {
    setConnectionsState({ isLoading: true, data: undefined })

    const screen = await render(<ConnectionsPage />)

    await expect
      .element(screen.getByText(/Loading connections/i))
      .toBeInTheDocument()
  })

  it('shows an error message on failure', async () => {
    setConnectionsState({ error: new Error('boom'), data: undefined })

    const screen = await render(<ConnectionsPage />)

    await expect
      .element(screen.getByText(/Failed to load connections/i))
      .toBeInTheDocument()
  })

  it('shows an empty state when there are no connections yet', async () => {
    const screen = await render(<ConnectionsPage />)

    await expect
      .element(screen.getByText(/No connections yet/i))
      .toBeInTheDocument()
  })

  it('renders a row per connection', async () => {
    setConnectionsState({ data: [connection] })

    const screen = await render(<ConnectionsPage />)

    await expect
      .element(screen.getByText('My Fake Connection'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('ACTIVE')).toBeInTheDocument()
  })

  it('shows the New Connection button when the caller has "automationcredentials"', async () => {
    const screen = await render(<ConnectionsPage />)

    await expect
      .element(screen.getByRole('button', { name: 'New Connection' }))
      .toBeInTheDocument()
  })

  it('hides the New Connection button without "automationcredentials"', async () => {
    setPermissions(['automation'])

    const screen = await render(<ConnectionsPage />)

    await expect
      .element(screen.getByRole('button', { name: 'New Connection' }))
      .not.toBeInTheDocument()
  })
})

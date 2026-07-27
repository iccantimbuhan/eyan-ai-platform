import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { useAuthStore } from '@/stores/auth-store'
import { ProvidersPage } from './providers-page'

// ForbiddenError itself calls useRouter()/useNavigate(), which requires a
// <RouterProvider> this isolated component test doesn't set up. Stubbed
// the same way AssetLibrary.test.tsx isolates sub-components it isn't
// exercising — these tests only need to confirm the permission gate
// short-circuits before any data-loading logic runs, not that
// ForbiddenError itself renders correctly (untested anywhere in this repo
// today, including RolesPage's identical `!can(...)` branch).
vi.mock('@/features/errors/forbidden', () => ({
  ForbiddenError: () => <div>Forbidden</div>,
}))

const useMcpProvidersSpy = vi.fn()
let mockProvidersReturn: {
  data: string[] | undefined
  isLoading: boolean
  error: unknown
}

vi.mock('../hooks/use-mcp-servers', () => ({
  useMcpProviders: (...args: unknown[]) => {
    useMcpProvidersSpy(...args)
    return mockProvidersReturn
  },
}))

function setProvidersState(overrides: Partial<typeof mockProvidersReturn> = {}) {
  mockProvidersReturn = {
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

describe('ProvidersPage', () => {
  beforeEach(() => {
    setProvidersState()
    setPermissions(['automation'])
  })

  it('shows a forbidden screen when the caller lacks the "automation" permission', async () => {
    setPermissions([])

    const screen = await render(<ProvidersPage />)

    await expect.element(screen.getByText('Forbidden')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', async () => {
    setProvidersState({ isLoading: true, data: undefined })

    const screen = await render(<ProvidersPage />)

    await expect
      .element(screen.getByText(/Loading providers/i))
      .toBeInTheDocument()
  })

  it('shows an error message on failure', async () => {
    setProvidersState({ error: new Error('boom'), data: undefined })

    const screen = await render(<ProvidersPage />)

    await expect
      .element(screen.getByText(/Failed to load registered providers/i))
      .toBeInTheDocument()
  })

  it('shows an empty state when no providers are registered', async () => {
    const screen = await render(<ProvidersPage />)

    await expect
      .element(screen.getByText(/No MCP providers are registered/i))
      .toBeInTheDocument()
  })

  it('renders a card per registered provider', async () => {
    setProvidersState({ data: ['fake'] })

    const screen = await render(<ProvidersPage />)

    await expect
      .element(screen.getByText('fake', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Registered', { exact: true }))
      .toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useAuthStore } from '@/stores/auth-store'
import type { AutomationAuditEvent } from '../types/automation'
import { AuditLogsPage } from './audit-logs-page'

const useAuditLogsSpy = vi.fn()
let mockAuditLogsReturn: {
  data:
    | {
        items: AutomationAuditEvent[]
        pagination: { page: number; pageSize: number; total: number; totalPages: number }
      }
    | undefined
  isLoading: boolean
  error: unknown
}

vi.mock('@/features/errors/forbidden', () => ({
  ForbiddenError: () => <div>Forbidden</div>,
}))

vi.mock('../hooks/use-audit-logs', () => ({
  useAuditLogs: (...args: unknown[]) => {
    useAuditLogsSpy(...args)
    return mockAuditLogsReturn
  },
}))

function setAuditLogsState(overrides: Partial<typeof mockAuditLogsReturn> = {}) {
  mockAuditLogsReturn = {
    data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } },
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

const event: AutomationAuditEvent = {
  id: 'evt-1',
  actorId: 'user-1',
  action: 'CONNECTION_CREATED',
  targetType: 'AutomationConnection',
  targetId: 'conn-1',
  metadata: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    useAuditLogsSpy.mockClear()
    setAuditLogsState()
    setPermissions(['auditlogs'])
  })

  it('shows a forbidden screen when the caller lacks the "auditlogs" permission', async () => {
    setPermissions(['automation'])

    const screen = await render(<AuditLogsPage />)

    await expect.element(screen.getByText('Forbidden')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', async () => {
    setAuditLogsState({ isLoading: true, data: undefined })

    const screen = await render(<AuditLogsPage />)

    await expect
      .element(screen.getByText(/Loading audit logs/i))
      .toBeInTheDocument()
  })

  it('shows an error message on failure', async () => {
    setAuditLogsState({ error: new Error('boom'), data: undefined })

    const screen = await render(<AuditLogsPage />)

    await expect
      .element(screen.getByText(/Failed to load audit logs/i))
      .toBeInTheDocument()
  })

  it('shows an empty state when there are no events yet', async () => {
    const screen = await render(<AuditLogsPage />)

    await expect
      .element(screen.getByText(/No audit events yet/i))
      .toBeInTheDocument()
  })

  it('renders a row per audit event', async () => {
    setAuditLogsState({
      data: { items: [event], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    })

    const screen = await render(<AuditLogsPage />)

    await expect
      .element(screen.getByText('CONNECTION_CREATED'))
      .toBeInTheDocument()
  })

  it('disables Previous on the first page and calls the hook with the next page on Next', async () => {
    setAuditLogsState({
      data: { items: [event], pagination: { page: 1, pageSize: 20, total: 40, totalPages: 2 } },
    })

    const screen = await render(<AuditLogsPage />)

    await expect
      .element(screen.getByRole('button', { name: 'Previous' }))
      .toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(useAuditLogsSpy).toHaveBeenCalledWith(2, 20)
  })
})

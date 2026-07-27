import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { ProjectAnalytics } from './ProjectAnalytics'
import type { ProjectAnalyticsSummary } from '../../types/analytics'

const summary: ProjectAnalyticsSummary = {
  totalAssets: 1,
  assetCounts: [{ assetType: 'BLOG', count: 1 }],
  reviewStatusCounts: [],
  publishingStatusCounts: [],
  providerUsage: [],
  brandKitUsage: [],
  reviewPerformance: { avgDurationMs: null, sampleSize: 0 },
  publishingPerformance: { avgDurationMs: null, sampleSize: 0 },
}

const useProjectAnalyticsSummaryMock = vi.fn()
const useProjectActivityMock = vi.fn()

vi.mock('../../hooks/use-analytics', () => ({
  useProjectAnalyticsSummary: (...args: unknown[]) => useProjectAnalyticsSummaryMock(...args),
  useProjectActivity: (...args: unknown[]) => useProjectActivityMock(...args),
}))

describe('ProjectAnalytics', () => {
  beforeEach(() => {
    useProjectAnalyticsSummaryMock.mockReset()
    useProjectActivityMock.mockReset()
    useProjectActivityMock.mockReturnValue({
      data: { items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
    })
  })

  it('shows a loading state', async () => {
    useProjectAnalyticsSummaryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    const screen = await render(<ProjectAnalytics projectId='project-1' />)

    await expect
      .element(screen.getByRole('status', { name: 'Loading analytics' }))
      .toBeInTheDocument()
  })

  it('shows an error message when the summary fails to load', async () => {
    useProjectAnalyticsSummaryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    const screen = await render(<ProjectAnalytics projectId='project-1' />)

    await expect
      .element(screen.getByText('Failed to load analytics for this project.'))
      .toBeInTheDocument()
  })

  it('renders the summary and activity feed once loaded', async () => {
    useProjectAnalyticsSummaryMock.mockReturnValue({
      data: summary,
      isLoading: false,
      isError: false,
    })

    const screen = await render(<ProjectAnalytics projectId='project-1' />)

    await expect.element(screen.getByText('Assets by Type')).toBeInTheDocument()
    await expect.element(screen.getByText('Recent Activity')).toBeInTheDocument()
  })
})

import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import type { ProjectAnalyticsSummary } from '../../types/analytics'
import { ProductionDashboard } from './ProductionDashboard'

// The app chrome (Header/Search/ThemeSwitch/ConfigDrawer/ProfileDropdown)
// requires a SidebarProvider and other app-shell context this test isn't
// about — stubbed out so this file only exercises the dashboard's own
// content, matching how other page-level tests in this codebase stub
// unrelated chrome/sub-components.
vi.mock('@/components/layout/header', () => ({
  Header: () => <div>Header Stub</div>,
}))

// PageHeader's breadcrumbs render a real <Link>, which needs a
// <RouterProvider> this isolated component test doesn't set up (same
// reasoning as the Header stub above) — stubbed to just the title/description
// text this test actually asserts on.
vi.mock('@/components/page-header', () => ({
  PageHeader: ({
    title,
    description,
  }: {
    title: ReactNode
    description?: ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  ),
}))

const summary: ProjectAnalyticsSummary = {
  totalAssets: 7,
  assetCounts: [
    { assetType: 'BLOG', count: 2 },
    { assetType: 'IMAGE', count: 4 },
    { assetType: 'VIDEO', count: 1 },
    { assetType: 'BRAND_KIT', count: 5 },
  ],
  reviewStatusCounts: [],
  publishingStatusCounts: [],
  providerUsage: [],
  brandKitUsage: [],
  reviewPerformance: { avgDurationMs: null, sampleSize: 0 },
  publishingPerformance: { avgDurationMs: null, sampleSize: 0 },
}

const useProjectsMock = vi.fn()
const usePlatformAnalyticsSummaryMock = vi.fn()
const usePlatformActivityMock = vi.fn()

vi.mock('../../hooks/use-projects', () => ({
  useProjects: (...args: unknown[]) => useProjectsMock(...args),
}))
vi.mock('../../hooks/use-analytics', () => ({
  usePlatformAnalyticsSummary: (...args: unknown[]) =>
    usePlatformAnalyticsSummaryMock(...args),
  usePlatformActivity: (...args: unknown[]) => usePlatformActivityMock(...args),
}))

describe('ProductionDashboard', () => {
  beforeEach(() => {
    useProjectsMock.mockReset()
    usePlatformAnalyticsSummaryMock.mockReset()
    usePlatformActivityMock.mockReset()

    useProjectsMock.mockReturnValue({
      data: {
        items: [],
        pagination: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
      },
      isLoading: false,
    })
    usePlatformActivityMock.mockReturnValue({
      data: {
        items: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
    })
  })

  it('renders headline tiles derived from the platform summary', async () => {
    usePlatformAnalyticsSummaryMock.mockReturnValue({
      data: summary,
      isLoading: false,
      isError: false,
    })

    const screen = await render(<ProductionDashboard />)

    await expect
      .element(screen.getByText('Production Dashboard'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Projects')).toBeInTheDocument()
    await expect.element(screen.getByText('3')).toBeInTheDocument()
    await expect.element(screen.getByText('Total Assets')).toBeInTheDocument()
    await expect.element(screen.getByText('7')).toBeInTheDocument()
    await expect.element(screen.getByText('AI Content')).toBeInTheDocument()
    await expect.element(screen.getByText('AI Images')).toBeInTheDocument()
    await expect.element(screen.getByText('AI Video')).toBeInTheDocument()
    await expect.element(screen.getByText('Brand Kits')).toBeInTheDocument()
  })

  it('shows an error message when the platform summary fails to load', async () => {
    usePlatformAnalyticsSummaryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    const screen = await render(<ProductionDashboard />)

    await expect
      .element(screen.getByText('Failed to load platform analytics.'))
      .toBeInTheDocument()
  })
})

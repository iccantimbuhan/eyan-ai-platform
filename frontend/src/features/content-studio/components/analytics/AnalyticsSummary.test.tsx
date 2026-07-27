import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'

import { AnalyticsSummary } from './AnalyticsSummary'
import type { ProjectAnalyticsSummary } from '../../types/analytics'

const summary: ProjectAnalyticsSummary = {
  totalAssets: 5,
  assetCounts: [
    { assetType: 'BLOG', count: 3 },
    { assetType: 'IMAGE', count: 2 },
  ],
  reviewStatusCounts: [{ status: 'APPROVED', count: 2 }],
  publishingStatusCounts: [{ status: 'PUBLISHED', count: 1 }],
  providerUsage: [{ provider: 'fake', count: 2, avgGenerationTimeMs: 800 }],
  brandKitUsage: [],
  reviewPerformance: { avgDurationMs: 1500, sampleSize: 2 },
  publishingPerformance: { avgDurationMs: 900, sampleSize: 1 },
}

describe('AnalyticsSummary', () => {
  it('renders every section from one summary DTO', async () => {
    const screen = await render(<AnalyticsSummary summary={summary} />)

    await expect.element(screen.getByText('Assets by Type')).toBeInTheDocument()
    await expect.element(screen.getByText('Provider Usage')).toBeInTheDocument()
    await expect.element(screen.getByText('Review Status')).toBeInTheDocument()
    await expect.element(screen.getByText('Publishing Status')).toBeInTheDocument()
    await expect.element(screen.getByText('Avg. Review Time')).toBeInTheDocument()
    await expect.element(screen.getByText('Avg. Publishing Time')).toBeInTheDocument()
  })
})

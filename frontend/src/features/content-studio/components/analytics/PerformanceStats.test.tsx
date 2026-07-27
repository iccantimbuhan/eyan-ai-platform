import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'

import { PerformanceStats } from './PerformanceStats'

describe('PerformanceStats', () => {
  it('renders formatted durations and sample sizes for both metrics', async () => {
    const screen = await render(
      <PerformanceStats
        reviewPerformance={{ avgDurationMs: 2500, sampleSize: 4 }}
        publishingPerformance={{ avgDurationMs: null, sampleSize: 0 }}
      />
    )

    await expect.element(screen.getByText('Avg. Review Time')).toBeInTheDocument()
    await expect.element(screen.getByText('2.5s')).toBeInTheDocument()
    await expect.element(screen.getByText('Based on 4 completions')).toBeInTheDocument()

    await expect.element(screen.getByText('Avg. Publishing Time')).toBeInTheDocument()
    await expect.element(screen.getByText('—')).toBeInTheDocument()
    await expect.element(screen.getByText('No completions yet')).toBeInTheDocument()
  })
})

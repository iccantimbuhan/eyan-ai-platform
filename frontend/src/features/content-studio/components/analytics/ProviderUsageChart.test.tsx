import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'

import { ProviderUsageChart } from './ProviderUsageChart'

describe('ProviderUsageChart', () => {
  it('shows an empty state when there are no generations', async () => {
    const screen = await render(<ProviderUsageChart providerUsage={[]} />)

    await expect.element(screen.getByText('No generations yet.')).toBeInTheDocument()
  })

  it('renders a chart title when there is provider usage', async () => {
    const screen = await render(
      <ProviderUsageChart
        providerUsage={[{ provider: 'fake', count: 2, avgGenerationTimeMs: 500 }]}
      />
    )

    await expect.element(screen.getByText('Provider Usage')).toBeInTheDocument()
    await expect.element(screen.getByText('No generations yet.')).not.toBeInTheDocument()
  })
})

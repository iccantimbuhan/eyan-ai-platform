import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'

import { AssetCountsChart } from './AssetCountsChart'

describe('AssetCountsChart', () => {
  it('shows an empty state when there are no assets', async () => {
    const screen = await render(<AssetCountsChart assetCounts={[]} />)

    await expect.element(screen.getByText('No assets yet.')).toBeInTheDocument()
  })

  it('renders a chart title when there are assets', async () => {
    const screen = await render(
      <AssetCountsChart assetCounts={[{ assetType: 'BLOG', count: 3 }]} />
    )

    await expect.element(screen.getByText('Assets by Type')).toBeInTheDocument()
    await expect.element(screen.getByText('No assets yet.')).not.toBeInTheDocument()
  })
})

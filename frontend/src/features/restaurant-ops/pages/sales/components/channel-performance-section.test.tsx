import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { ChannelTotal } from '../../../types/restaurant-ops'
import { ChannelPerformanceSection } from './channel-performance-section'

function channel(overrides: Partial<ChannelTotal> = {}): ChannelTotal {
  return {
    salesChannelId: 'wolt-id',
    channelName: 'Wolt',
    amount: '2500.00',
    percentOfChannelEntriesTotal: '23.4',
    activeDays: 6,
    averageAmountPerActiveDay: '416.67',
    ...overrides,
  }
}

describe('ChannelPerformanceSection', () => {
  it('shows an empty state when no channel sales are recorded', async () => {
    const screen = await render(<ChannelPerformanceSection channelTotals={[]} />)

    await expect
      .element(screen.getByText('No channel sales recorded for this range.'))
      .toBeInTheDocument()
  })

  it('renders amount, percent share, active days, and average per active day', async () => {
    const screen = await render(<ChannelPerformanceSection channelTotals={[channel()]} />)

    await expect.element(screen.getByText('Wolt')).toBeInTheDocument()
    await expect.element(screen.getByText('€2500.00')).toBeInTheDocument()
    await expect.element(screen.getByText('23.4%')).toBeInTheDocument()
    await expect.element(screen.getByRole('cell', { name: '6', exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('€416.67')).toBeInTheDocument()
  })

  // Deliberately neutral labels — never "best channel" (spec §E).
  it('labels the highest-sales and highest-average channels neutrally, not as "best"', async () => {
    const screen = await render(
      <ChannelPerformanceSection
        channelTotals={[
          channel({ salesChannelId: 'wolt-id', channelName: 'Wolt', amount: '2500.00', averageAmountPerActiveDay: '416.67' }),
          channel({ salesChannelId: 'bolt-id', channelName: 'Bolt', amount: '1900.00', averageAmountPerActiveDay: '950.00', activeDays: 2 }),
        ]}
      />
    )

    await expect.element(screen.getByText('Highest recorded sales')).toBeInTheDocument()
    await expect.element(screen.getByText('Highest average sales/day')).toBeInTheDocument()
    await expect.element(screen.getByText('Best channel')).not.toBeInTheDocument()
  })
})

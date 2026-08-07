import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { DailySalesRecord } from '../../../types/restaurant-ops'
import { SalesDetailTabs } from './sales-detail-tabs'

function record(overrides: Partial<DailySalesRecord> = {}): DailySalesRecord {
  return {
    id: 'sales-1',
    branchId: 'branch-1',
    restaurantId: 'rest-1',
    businessDate: '2026-08-03',
    source: 'POS_REPORT',
    posReportType: 'Z_REPORT',
    posReportNumber: '851',
    posReportedTotal: '1226.55',
    totalSales: '1226.55',
    discountsTotal: '261.59',
    vouchersAmount: '0.00',
    vouchersCount: null,
    notes: null,
    channels: [],
    paymentMethods: [],
    categories: [],
    items: [],
    reconciliation: {
      totalSales: '1226.55',
      posReportedTotal: '1226.55',
      posReportedRecordCount: 1,
      channelEntriesTotal: '0.00',
      varianceVsPosReportedTotal: '0.00',
      varianceVsChannelEntriesTotal: '1226.55',
    },
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  }
}

describe('SalesDetailTabs', () => {
  it('shows an empty state for each tab when no lines are recorded', async () => {
    const screen = await render(<SalesDetailTabs record={record()} />)

    await expect
      .element(screen.getByText('No channel entries recorded for this day.'))
      .toBeInTheDocument()
  })

  // The spec's own worked example: Wolt €229.05, Bolt €152.25.
  it('renders channel entries with their name and amount', async () => {
    const rec = record({
      channels: [
        { id: 'c1', salesChannelId: 'wolt-id', channelName: 'Wolt', amount: '229.05', createdAt: '2026-08-03T00:00:00.000Z' },
        { id: 'c2', salesChannelId: 'bolt-id', channelName: 'Bolt', amount: '152.25', createdAt: '2026-08-03T00:00:00.000Z' },
      ],
    })

    const screen = await render(<SalesDetailTabs record={rec} />)

    await expect.element(screen.getByText('Wolt')).toBeInTheDocument()
    await expect.element(screen.getByText('€229.05')).toBeInTheDocument()
    await expect.element(screen.getByText('Bolt')).toBeInTheDocument()
    await expect.element(screen.getByText('€152.25')).toBeInTheDocument()
  })

  it('renders itemized sales with quantity, category, and amount', async () => {
    const rec = record({
      items: [
        {
          id: 'i1',
          menuItemId: null,
          itemName: 'Margherita',
          categoryName: 'Pizza',
          quantity: '3.00',
          amount: '36.00',
          createdAt: '2026-08-03T00:00:00.000Z',
        },
      ],
    })

    const screen = await render(<SalesDetailTabs record={rec} />)

    await screen.getByRole('tab', { name: 'Itemized Sales' }).click()

    await expect.element(screen.getByText('Margherita')).toBeInTheDocument()
    await expect.element(screen.getByText('Pizza')).toBeInTheDocument()
  })
})

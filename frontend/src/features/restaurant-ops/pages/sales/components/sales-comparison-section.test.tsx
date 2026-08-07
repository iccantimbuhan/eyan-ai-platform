import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { SalesComparison, SalesComparisonEntry, WeeklySalesSummary } from '../../../types/restaurant-ops'
import { SalesComparisonSection } from './sales-comparison-section'

function weeklySummary(overrides: Partial<WeeklySalesSummary> = {}): WeeklySalesSummary {
  return {
    branchId: 'branch-1',
    startDate: '2026-08-03',
    endDate: '2026-08-09',
    totalSales: '0.00',
    discountsTotal: '0.00',
    vouchersAmount: '0.00',
    vouchersCount: 0,
    coverage: { daysInRange: 7, daysRecorded: 0, missingDays: 7, missingDates: [], averageSalesPerRecordedDay: null },
    reconciliation: {
      totalSales: '0.00',
      posReportedTotal: null,
      posReportedRecordCount: 0,
      channelEntriesTotal: '0.00',
      varianceVsPosReportedTotal: null,
      varianceVsChannelEntriesTotal: '0.00',
    },
    dailySales: [],
    channelTotals: [],
    posSourceTotals: [],
    channelsByPosSource: [],
    paymentMethodTotals: [],
    paymentMethodPosSourceTotals: [],
    paymentMethodsByPosSource: [],
    categoryTotals: [],
    topItems: [],
    ...overrides,
  }
}

function entry(overrides: Partial<SalesComparisonEntry> = {}): SalesComparisonEntry {
  return { key: 'totalSales', label: 'Total Sales', current: '1000.00', previous: '800.00', change: '200.00', changePercent: '25.0', ...overrides }
}

function comparison(overrides: Partial<SalesComparison> = {}): SalesComparison {
  return {
    branchId: 'branch-1',
    current: weeklySummary(),
    previous: weeklySummary(),
    totalSalesComparison: entry(),
    channelComparison: [],
    categoryComparison: [],
    topItemsComparison: [],
    ...overrides,
  }
}

describe('SalesComparisonSection', () => {
  it('renders current, previous, change, and change percent for the total sales comparison', async () => {
    const screen = await render(<SalesComparisonSection comparison={comparison()} />)

    await expect.element(screen.getByText('€1000.00')).toBeInTheDocument()
    await expect.element(screen.getByText('€800.00')).toBeInTheDocument()
    await expect.element(screen.getByText('+25.0%')).toBeInTheDocument()
  })

  // Division by zero must never produce an invalid percentage (spec §C).
  it('shows "No comparison data" instead of an invalid percentage when the previous period is zero', async () => {
    const screen = await render(
      <SalesComparisonSection
        comparison={comparison({ totalSalesComparison: entry({ previous: '0.00', changePercent: null }) })}
      />
    )

    await expect.element(screen.getByText('No comparison data')).toBeInTheDocument()
  })

  it('shows an empty state per breakdown table when there is no data for either period', async () => {
    const screen = await render(<SalesComparisonSection comparison={comparison()} />)

    await expect.element(screen.getByText('No data for either period.').first()).toBeInTheDocument()
  })

  it('renders a channel comparison row present in only the current period', async () => {
    const screen = await render(
      <SalesComparisonSection
        comparison={comparison({
          channelComparison: [entry({ key: 'wolt-id', label: 'Wolt', current: '300.00', previous: '0.00', changePercent: null })],
        })}
      />
    )

    await expect.element(screen.getByText('Wolt')).toBeInTheDocument()
    await expect.element(screen.getByText('€300.00')).toBeInTheDocument()
  })
})

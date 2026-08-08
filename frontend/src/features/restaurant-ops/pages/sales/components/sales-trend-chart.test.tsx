import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { DailySalesTotal } from '../../../types/restaurant-ops'
import { SalesTrendChart } from './sales-trend-chart'

function day(date: string, totalSales: string): DailySalesTotal {
  return {
    date,
    totalSales,
    posReportedTotal: null,
    channelEntriesTotal: '0.00',
    discountsTotal: '0.00',
    physicalCashBasis: '0.00',
    expectedCash: '0.00',
    actualCashCounted: null,
    discrepancy: null,
    status: 'NOT_COUNTED',
  }
}

// Recharts' <ResponsiveContainer> measures its parent via ResizeObserver,
// which does not resolve to a non-zero size in this component-only browser
// test harness (no precedent for testing a recharts chart's rendered SVG
// output exists anywhere else in this codebase either) — so these tests
// cover the component's own branch logic (empty state) rather than
// recharts' internal rendering.
describe('SalesTrendChart', () => {
  it('shows a no-data state when there are no recorded days', async () => {
    const screen = await render(<SalesTrendChart dailySales={[]} />)

    await expect
      .element(screen.getByText('No sales recorded for this range.'))
      .toBeInTheDocument()
  })

  it('renders the chart title (not the no-data state) once at least one day is recorded', async () => {
    const screen = await render(<SalesTrendChart dailySales={[day('2026-08-03', '1240.00')]} />)

    await expect.element(screen.getByText('Sales by Day')).toBeInTheDocument()
    await expect
      .element(screen.getByText('No sales recorded for this range.'))
      .not.toBeInTheDocument()
  })
})

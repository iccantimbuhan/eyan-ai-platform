import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { SalesDataCoverage } from '../../../types/restaurant-ops'
import { SalesCoverageCard } from './sales-coverage-card'

function coverage(overrides: Partial<SalesDataCoverage> = {}): SalesDataCoverage {
  return {
    daysInRange: 7,
    daysRecorded: 7,
    missingDays: 0,
    missingDates: [],
    averageSalesPerRecordedDay: '150.00',
    ...overrides,
  }
}

describe('SalesCoverageCard', () => {
  it('renders the four coverage KPIs', async () => {
    const screen = await render(<SalesCoverageCard coverage={coverage()} />)

    await expect.element(screen.getByText('7', { exact: true }).first()).toBeInTheDocument()
    await expect.element(screen.getByText('€150.00')).toBeInTheDocument()
  })

  it('shows missing dates when days are missing — never treated as zero', async () => {
    const screen = await render(
      <SalesCoverageCard
        coverage={coverage({ daysInRange: 7, daysRecorded: 6, missingDays: 1, missingDates: ['2026-08-06'] })}
      />
    )

    await expect.element(screen.getByText(/Missing:/)).toBeInTheDocument()
  })

  it('hides the missing-dates line and shows a dash for average when no days are recorded', async () => {
    const screen = await render(
      <SalesCoverageCard
        coverage={coverage({
          daysInRange: 7,
          daysRecorded: 0,
          missingDays: 7,
          missingDates: ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09'],
          averageSalesPerRecordedDay: null,
        })}
      />
    )

    await expect.element(screen.getByText('—')).toBeInTheDocument()
    await expect.element(screen.getByText(/Missing:/)).toBeInTheDocument()
  })
})

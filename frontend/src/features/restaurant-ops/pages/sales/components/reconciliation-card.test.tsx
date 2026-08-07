import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { SalesReconciliation } from '../../../types/restaurant-ops'
import { ReconciliationCard } from './reconciliation-card'

function reconciliation(overrides: Partial<SalesReconciliation> = {}): SalesReconciliation {
  return {
    totalSales: '1226.55',
    posReportedTotal: '1226.55',
    posReportedRecordCount: 1,
    channelEntriesTotal: '858.65',
    varianceVsPosReportedTotal: '0.00',
    varianceVsChannelEntriesTotal: '367.90',
    ...overrides,
  }
}

describe('ReconciliationCard', () => {
  // The spec's own worked example: POS €1226.55 vs channel entries €858.65.
  it('surfaces a non-zero variance with a neutral "Requires review" label, never an error', async () => {
    const screen = await render(<ReconciliationCard reconciliation={reconciliation()} />)

    await expect.element(screen.getByText('€367.90')).toBeInTheDocument()
    await expect.element(screen.getByText('Requires review')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/never automatically reconciled/))
      .toBeInTheDocument()
  })

  it('does not show a "Requires review" badge when the variance is zero', async () => {
    const screen = await render(
      <ReconciliationCard
        reconciliation={reconciliation({ channelEntriesTotal: '1226.55', varianceVsChannelEntriesTotal: '0.00' })}
      />
    )

    await expect.element(screen.getByText('Requires review')).not.toBeInTheDocument()
  })

  it('shows a dash and skips the POS variance row when no POS report backs the record', async () => {
    const screen = await render(
      <ReconciliationCard
        reconciliation={reconciliation({ posReportedTotal: null, varianceVsPosReportedTotal: null, posReportedRecordCount: 0 })}
      />
    )

    await expect.element(screen.getByText('—')).toBeInTheDocument()
    await expect.element(screen.getByText('Recorded difference vs POS')).not.toBeInTheDocument()
  })
})

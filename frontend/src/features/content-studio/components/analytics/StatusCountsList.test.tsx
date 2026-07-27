import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'

import { StatusCountsList } from './StatusCountsList'

describe('StatusCountsList', () => {
  it('shows the empty message when every count is zero', async () => {
    const screen = await render(
      <StatusCountsList
        title='Review Status'
        counts={[{ status: 'DRAFT', count: 0 }]}
        statusLabel={(s) => s}
        statusVariant={() => 'outline'}
        emptyMessage='No assets have been reviewed yet.'
      />
    )

    await expect
      .element(screen.getByText('No assets have been reviewed yet.'))
      .toBeInTheDocument()
  })

  it('lists each non-zero status with its label and count', async () => {
    const screen = await render(
      <StatusCountsList
        title='Review Status'
        counts={[
          { status: 'APPROVED', count: 3 },
          { status: 'DRAFT', count: 0 },
        ]}
        statusLabel={(s) => (s === 'APPROVED' ? 'Approved' : s)}
        statusVariant={() => 'secondary'}
        emptyMessage='No assets have been reviewed yet.'
      />
    )

    await expect.element(screen.getByText('Approved')).toBeInTheDocument()
    await expect.element(screen.getByText('3')).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { ReviewStatus } from '../../types/asset'
import { AssetStatusBadge } from './AssetStatusBadge'

describe('AssetStatusBadge', () => {
  const cases: { status: ReviewStatus; label: string }[] = [
    { status: 'DRAFT', label: 'Draft' },
    { status: 'NEEDS_REVIEW', label: 'Needs Review' },
    { status: 'APPROVED', label: 'Approved' },
    { status: 'REJECTED', label: 'Rejected' },
    { status: 'PUBLISHED', label: 'Published' },
  ]

  for (const { status, label } of cases) {
    it(`renders the "${label}" label for status ${status}`, async () => {
      const screen = await render(<AssetStatusBadge status={status} />)

      await expect.element(screen.getByText(label, { exact: true })).toBeInTheDocument()
    })
  }
})

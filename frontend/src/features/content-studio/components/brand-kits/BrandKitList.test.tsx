import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { BrandKit } from '../../types/brand-kit'
import { BrandKitList } from './BrandKitList'

const useBrandKitsMock = vi.fn()
vi.mock('../../hooks/use-brand-kits', () => ({
  useBrandKits: (...args: unknown[]) => useBrandKitsMock(...args),
}))

vi.mock('./BrandKitCard', () => ({
  BrandKitCard: ({ brandKit }: { brandKit: BrandKit }) => (
    <div data-testid='brand-kit-card'>{brandKit.name}</div>
  ),
}))

vi.mock('./BrandKitFormDialog', () => ({
  BrandKitFormDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid='brand-kit-form-dialog' /> : null,
}))

const brandKit: BrandKit = {
  id: 'bk-1',
  projectId: 'project-1',
  createdBy: 'user-1',
  name: 'Acme Brand Kit',
  client: 'Acme Corp',
  logos: null,
  primaryColors: null,
  secondaryColors: null,
  fonts: null,
  typography: null,
  toneOfVoice: 'Confident and friendly',
  writingStyle: null,
  audience: null,
  ctaStyle: null,
  approvedTerminology: [],
  restrictedWords: [],
  brandGuidelines: null,
  imageStyle: null,
  socialMediaGuidelines: null,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('BrandKitList', () => {
  it('shows an empty state when there are no brand kits', async () => {
    useBrandKitsMock.mockReturnValue({ data: [], isLoading: false })

    const screen = await render(<BrandKitList projectId='project-1' />)

    await expect.element(screen.getByText('No brand kits yet')).toBeInTheDocument()
  })

  it('renders a card per brand kit', async () => {
    useBrandKitsMock.mockReturnValue({ data: [brandKit], isLoading: false })

    const screen = await render(<BrandKitList projectId='project-1' />)

    await expect.element(screen.getByText('Acme Brand Kit')).toBeInTheDocument()
  })

  it('opens the create dialog when "New Brand Kit" is clicked', async () => {
    useBrandKitsMock.mockReturnValue({ data: [], isLoading: false })

    const screen = await render(<BrandKitList projectId='project-1' />)

    await userEvent.click(screen.getByText('New Brand Kit'))

    await expect
      .element(screen.getByTestId('brand-kit-form-dialog'))
      .toBeInTheDocument()
  })
})

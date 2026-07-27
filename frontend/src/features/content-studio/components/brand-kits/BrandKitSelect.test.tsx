import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { BrandKit } from '../../types/brand-kit'
import { BrandKitSelect } from './BrandKitSelect'

const useBrandKitsMock = vi.fn()
vi.mock('../../hooks/use-brand-kits', () => ({
  useBrandKits: (...args: unknown[]) => useBrandKitsMock(...args),
}))

const brandKit: BrandKit = {
  id: 'bk-1',
  projectId: 'project-1',
  createdBy: 'user-1',
  name: 'Acme Brand Kit',
  client: null,
  logos: null,
  primaryColors: null,
  secondaryColors: null,
  fonts: null,
  typography: null,
  toneOfVoice: null,
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

describe('BrandKitSelect', () => {
  it('defaults to "None" when no value is selected', async () => {
    useBrandKitsMock.mockReturnValue({ data: [brandKit] })

    const screen = await render(
      <BrandKitSelect
        projectId='project-1'
        value={undefined}
        onValueChange={vi.fn()}
      />
    )

    await expect.element(screen.getByText('None')).toBeInTheDocument()
  })

  it('lists every brand kit from the project plus a None option', async () => {
    useBrandKitsMock.mockReturnValue({ data: [brandKit] })

    const screen = await render(
      <BrandKitSelect
        projectId='project-1'
        value={undefined}
        onValueChange={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('combobox'))

    await expect
      .element(screen.getByRole('option', { name: 'None' }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('option', { name: 'Acme Brand Kit' }))
      .toBeInTheDocument()
  })

  it('calls onValueChange with the selected brand kit id', async () => {
    useBrandKitsMock.mockReturnValue({ data: [brandKit] })
    const onValueChange = vi.fn()

    const screen = await render(
      <BrandKitSelect
        projectId='project-1'
        value={undefined}
        onValueChange={onValueChange}
      />
    )

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Acme Brand Kit'))

    expect(onValueChange).toHaveBeenCalledWith('bk-1')
  })

  it('calls onValueChange with undefined when "None" is selected', async () => {
    useBrandKitsMock.mockReturnValue({ data: [brandKit] })
    const onValueChange = vi.fn()

    const screen = await render(
      <BrandKitSelect
        projectId='project-1'
        value='bk-1'
        onValueChange={onValueChange}
      />
    )

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'None' }))

    expect(onValueChange).toHaveBeenCalledWith(undefined)
  })
})

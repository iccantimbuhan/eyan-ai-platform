import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { BrandKit } from '../../types/brand-kit'
import { BrandKitFormDialog } from './BrandKitFormDialog'

const createMock = vi.fn().mockResolvedValue(undefined)
const updateMock = vi.fn().mockResolvedValue(undefined)

vi.mock('../../hooks/use-create-brand-kit', () => ({
  useCreateBrandKit: () => ({ mutateAsync: createMock, isPending: false }),
}))

vi.mock('../../hooks/use-update-brand-kit', () => ({
  useUpdateBrandKit: () => ({ mutateAsync: updateMock, isPending: false }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const existingBrandKit: BrandKit = {
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
  approvedTerminology: ['Acme'],
  restrictedWords: [],
  brandGuidelines: null,
  imageStyle: null,
  socialMediaGuidelines: null,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('BrandKitFormDialog', () => {
  beforeEach(() => {
    createMock.mockClear()
    updateMock.mockClear()
  })

  it('starts empty in create mode', async () => {
    const screen = await render(
      <BrandKitFormDialog
        projectId='project-1'
        mode='create'
        open
        onOpenChange={vi.fn()}
      />
    )

    await expect
      .element(screen.getByRole('heading', { name: 'Create Brand Kit' }))
      .toBeInTheDocument()
    await expect.element(screen.getByLabelText('Brand Name')).toHaveValue('')
  })

  it('creates a brand kit, splitting comma-separated terminology into an array', async () => {
    const screen = await render(
      <BrandKitFormDialog
        projectId='project-1'
        mode='create'
        open
        onOpenChange={vi.fn()}
      />
    )

    await userEvent.fill(screen.getByLabelText('Brand Name'), 'Acme')
    await userEvent.fill(
      screen.getByLabelText('Approved Terminology (comma-separated)'),
      'Acme, AcmeCloud'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        name: 'Acme',
        approvedTerminology: ['Acme', 'AcmeCloud'],
      })
    )
  })

  it('pre-fills the form in edit mode and submits an update without projectId', async () => {
    const screen = await render(
      <BrandKitFormDialog
        projectId='project-1'
        mode='edit'
        brandKit={existingBrandKit}
        open
        onOpenChange={vi.fn()}
      />
    )

    await expect
      .element(screen.getByRole('heading', { name: 'Edit Brand Kit' }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByLabelText('Brand Name'))
      .toHaveValue('Acme Brand Kit')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'bk-1',
        payload: expect.objectContaining({ name: 'Acme Brand Kit' }),
      })
    )
    const [[call]] = updateMock.mock.calls
    expect(call.payload).not.toHaveProperty('projectId')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { SavedPrompt } from '../../types/saved-prompt'
import { SavePromptDialog } from './SavePromptDialog'

const createMock = vi.fn()
const updateMock = vi.fn()

vi.mock('../../hooks/use-create-saved-prompt', () => ({
  useCreateSavedPrompt: () => ({
    mutate: createMock,
    isPending: false,
    isError: false,
  }),
}))

vi.mock('../../hooks/use-update-saved-prompt', () => ({
  useUpdateSavedPrompt: () => ({
    mutate: updateMock,
    isPending: false,
    isError: false,
  }),
}))

const existingPrompt: SavedPrompt = {
  id: 'sp-1',
  userId: 'user-1',
  name: 'My SEO Prompt',
  promptBody: 'Write an SEO-optimized post about electric vehicles.',
  contentType: 'MARKETING_COPY',
  createdAt: '',
  updatedAt: '',
}

describe('SavePromptDialog', () => {
  beforeEach(() => {
    createMock.mockReset()
    updateMock.mockReset()
  })

  it('starts empty in create mode', async () => {
    const screen = await render(
      <SavePromptDialog open onOpenChange={vi.fn()} prompt={null} />
    )

    await expect
      .element(screen.getByRole('heading', { name: 'Save Prompt' }))
      .toBeInTheDocument()
    await expect.element(screen.getByLabelText('Name')).toHaveValue('')
    await expect.element(screen.getByLabelText('Prompt', { exact: true })).toHaveValue('')
  })

  it('disables submit until name and prompt body are filled', async () => {
    const screen = await render(
      <SavePromptDialog open onOpenChange={vi.fn()} prompt={null} />
    )

    const submitButton = screen.getByRole('button', { name: 'Save Prompt' })
    await expect.element(submitButton).toBeDisabled()

    await userEvent.fill(screen.getByLabelText('Name'), 'My Prompt')
    await expect.element(submitButton).toBeDisabled()

    await userEvent.fill(screen.getByLabelText('Prompt', { exact: true }), 'Write about X.')
    await expect.element(submitButton).toBeEnabled()
  })

  it('creates a new prompt with the entered values', async () => {
    const screen = await render(
      <SavePromptDialog open onOpenChange={vi.fn()} prompt={null} />
    )

    await userEvent.fill(screen.getByLabelText('Name'), 'My Prompt')
    await userEvent.fill(screen.getByLabelText('Prompt', { exact: true }), 'Write about X.')
    await userEvent.click(screen.getByRole('button', { name: 'Save Prompt' }))

    expect(createMock).toHaveBeenCalledWith(
      {
        name: 'My Prompt',
        promptBody: 'Write about X.',
        contentType: 'BLOG',
      },
      expect.anything()
    )
  })

  it('pre-fills the form in edit mode and submits an update', async () => {
    const screen = await render(
      <SavePromptDialog open onOpenChange={vi.fn()} prompt={existingPrompt} />
    )

    await expect
      .element(screen.getByRole('heading', { name: 'Edit Prompt' }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByLabelText('Name'))
      .toHaveValue('My SEO Prompt')
    await expect
      .element(screen.getByLabelText('Prompt', { exact: true }))
      .toHaveValue('Write an SEO-optimized post about electric vehicles.')

    await userEvent.click(
      screen.getByRole('button', { name: 'Save Changes' })
    )

    expect(updateMock).toHaveBeenCalledWith(
      {
        id: 'sp-1',
        payload: {
          name: 'My SEO Prompt',
          promptBody: 'Write an SEO-optimized post about electric vehicles.',
          contentType: 'MARKETING_COPY',
        },
      },
      expect.anything()
    )
  })
})

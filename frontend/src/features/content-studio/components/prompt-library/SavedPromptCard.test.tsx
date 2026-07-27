import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { SavedPrompt } from '../../types/saved-prompt'
import { SavedPromptCard } from './SavedPromptCard'

const prompt: SavedPrompt = {
  id: 'sp-1',
  userId: 'user-1',
  projectId: null,
  name: 'My SEO Prompt',
  promptBody: 'Write an SEO-optimized post about {{topic}}.',
  contentType: 'MARKETING_COPY',
  createdAt: '',
  updatedAt: '',
}

describe('SavedPromptCard', () => {
  it('renders the name, content type, and prompt snippet', async () => {
    const screen = await render(<SavedPromptCard prompt={prompt} />)

    await expect
      .element(screen.getByText('My SEO Prompt', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Marketing Copy', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(/Write an SEO-optimized post about/i))
      .toBeInTheDocument()
  })

  it('is not clickable and shows no action buttons when no callbacks are given', async () => {
    const screen = await render(<SavedPromptCard prompt={prompt} />)

    await expect.element(screen.getByRole('button')).not.toBeInTheDocument()
  })

  it('calls onSelect when clicked in select mode', async () => {
    const onSelect = vi.fn()
    const screen = await render(
      <SavedPromptCard prompt={prompt} onSelect={onSelect} />
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onSelect).toHaveBeenCalledWith(prompt)
  })

  it('calls onSelect when activated with the keyboard', async () => {
    const onSelect = vi.fn()
    const screen = await render(
      <SavedPromptCard prompt={prompt} onSelect={onSelect} />
    )

    const card = screen.getByRole('button')
    await card.element().focus()
    await userEvent.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(prompt)
  })

  it('shows Edit and Delete actions in manage mode and calls the right handler', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const screen = await render(
      <SavedPromptCard prompt={prompt} onEdit={onEdit} onDelete={onDelete} />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Edit My SEO Prompt' })
    )
    expect(onEdit).toHaveBeenCalledWith(prompt)

    await userEvent.click(
      screen.getByRole('button', { name: 'Delete My SEO Prompt' })
    )
    expect(onDelete).toHaveBeenCalledWith(prompt)
  })

  it('does not trigger onSelect when an action button is clicked', async () => {
    const onSelect = vi.fn()
    const onEdit = vi.fn()
    const screen = await render(
      <SavedPromptCard prompt={prompt} onSelect={onSelect} onEdit={onEdit} />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Edit My SEO Prompt', exact: true })
    )

    expect(onEdit).toHaveBeenCalledWith(prompt)
    expect(onSelect).not.toHaveBeenCalled()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { SavedPrompt } from '../../types/saved-prompt'
import { SavedPromptList } from './SavedPromptList'

const prompt: SavedPrompt = {
  id: 'sp-1',
  userId: 'user-1',
  name: 'My SEO Prompt',
  promptBody: 'Write an SEO-optimized post about electric vehicles.',
  contentType: 'MARKETING_COPY',
  createdAt: '',
  updatedAt: '',
}

let mockUseSavedPrompts: () => {
  data: SavedPrompt[] | undefined
  isLoading: boolean
  isError: boolean
}

vi.mock('../../hooks/use-saved-prompts', () => ({
  useSavedPrompts: () => mockUseSavedPrompts(),
}))

function setState(
  overrides: Partial<{
    data: SavedPrompt[] | undefined
    isLoading: boolean
    isError: boolean
  }> = {}
) {
  mockUseSavedPrompts = () => ({
    data: [],
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

describe('SavedPromptList', () => {
  it('shows a loading status while fetching', async () => {
    setState({ isLoading: true, data: undefined })

    const screen = await render(
      <SavedPromptList onEdit={vi.fn()} onDeleteRequest={vi.fn()} />
    )

    await expect
      .element(screen.getByRole('status', { name: 'Loading saved prompts' }))
      .toBeInTheDocument()
  })

  it('shows an error message on failure', async () => {
    setState({ isError: true, data: undefined })

    const screen = await render(
      <SavedPromptList onEdit={vi.fn()} onDeleteRequest={vi.fn()} />
    )

    await expect
      .element(screen.getByText(/Failed to load saved prompts/i))
      .toBeInTheDocument()
  })

  it('shows an empty state when there are no saved prompts', async () => {
    setState({ data: [] })

    const screen = await render(
      <SavedPromptList onEdit={vi.fn()} onDeleteRequest={vi.fn()} />
    )

    await expect
      .element(screen.getByText(/haven.t saved any prompts yet/i))
      .toBeInTheDocument()
  })

  it('renders a card per saved prompt', async () => {
    setState({ data: [prompt] })

    const screen = await render(
      <SavedPromptList onEdit={vi.fn()} onDeleteRequest={vi.fn()} />
    )

    await expect
      .element(screen.getByText('My SEO Prompt', { exact: true }))
      .toBeInTheDocument()
  })

  it('calls onEdit and onDeleteRequest from the card actions', async () => {
    setState({ data: [prompt] })
    const onEdit = vi.fn()
    const onDeleteRequest = vi.fn()

    const screen = await render(
      <SavedPromptList onEdit={onEdit} onDeleteRequest={onDeleteRequest} />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Edit My SEO Prompt' })
    )
    expect(onEdit).toHaveBeenCalledWith(prompt)

    await userEvent.click(
      screen.getByRole('button', { name: 'Delete My SEO Prompt' })
    )
    expect(onDeleteRequest).toHaveBeenCalledWith(prompt)
  })
})

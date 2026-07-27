import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { GeneratedContentItem } from '../../types/content'
import { GenerationHistory } from './GenerationHistory'

const shortItem: GeneratedContentItem = {
  id: 'gc-1',
  projectId: 'project-1',
  type: 'BLOG',
  prompt: 'Write a short intro.',
  output: 'A short generated output.',
  model: 'qwen2.5-coder:7b',
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
}

const longItem: GeneratedContentItem = {
  ...shortItem,
  id: 'gc-2',
  prompt: 'Write a long post.',
  output: 'x'.repeat(400),
}

const deleteMock = vi.fn()

let mockUseContent: () => {
  data: { items: GeneratedContentItem[] } | undefined
  isLoading: boolean
  isError: boolean
}

vi.mock('../../hooks/use-content', () => ({
  useContent: () => mockUseContent(),
}))

vi.mock('../../hooks/use-delete-content', () => ({
  useDeleteContent: () => ({
    mutate: deleteMock,
    isPending: false,
  }),
}))

function setState(
  overrides: Partial<{
    data: { items: GeneratedContentItem[] } | undefined
    isLoading: boolean
    isError: boolean
  }> = {}
) {
  mockUseContent = () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

describe('GenerationHistory', () => {
  beforeEach(() => {
    deleteMock.mockReset()
  })

  it('shows a loading status while fetching', async () => {
    setState({ isLoading: true, data: undefined })

    const screen = await render(<GenerationHistory projectId='project-1' />)

    await expect
      .element(screen.getByRole('status', { name: 'Loading generation history' }))
      .toBeInTheDocument()
  })

  it('shows an error message on failure', async () => {
    setState({ isError: true, data: undefined })

    const screen = await render(<GenerationHistory projectId='project-1' />)

    await expect
      .element(screen.getByText(/Failed to load generation history/i))
      .toBeInTheDocument()
  })

  it('shows an empty state when there is no content yet', async () => {
    setState({ data: { items: [] } })

    const screen = await render(<GenerationHistory projectId='project-1' />)

    await expect
      .element(screen.getByText(/No content generated yet/i))
      .toBeInTheDocument()
  })

  it('shows short output in full with no Read more toggle', async () => {
    setState({ data: { items: [shortItem] } })

    const screen = await render(<GenerationHistory projectId='project-1' />)

    await expect
      .element(screen.getByText(shortItem.output, { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: 'Read more' }))
      .not.toBeInTheDocument()
  })

  it('truncates long output behind a Read more toggle that expands and collapses', async () => {
    setState({ data: { items: [longItem] } })

    const screen = await render(<GenerationHistory projectId='project-1' />)

    const readMore = screen.getByRole('button', { name: 'Read more' })
    await expect.element(readMore).toBeInTheDocument()
    await expect
      .element(screen.getByText(longItem.output, { exact: true }))
      .not.toBeInTheDocument()

    await userEvent.click(readMore)

    await expect
      .element(screen.getByText(longItem.output, { exact: true }))
      .toBeInTheDocument()
    const showLess = screen.getByRole('button', { name: 'Show less' })
    await expect.element(showLess).toBeInTheDocument()

    await userEvent.click(showLess)

    await expect
      .element(screen.getByRole('button', { name: 'Read more' }))
      .toBeInTheDocument()
  })

  it('asks for confirmation before deleting, and only deletes on confirm', async () => {
    setState({ data: { items: [shortItem] } })

    const screen = await render(<GenerationHistory projectId='project-1' />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Delete generated content' })
    )

    await expect
      .element(screen.getByRole('heading', { name: 'Delete generated content?' }))
      .toBeInTheDocument()
    expect(deleteMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(deleteMock).toHaveBeenCalledWith(shortItem.id, expect.anything())
  })
})

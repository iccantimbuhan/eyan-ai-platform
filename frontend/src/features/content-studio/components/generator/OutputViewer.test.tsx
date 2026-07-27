import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'

import type { useGenerateContent } from '../../hooks/use-generate-content'
import { OutputViewer } from './OutputViewer'

type GenerateMutation = ReturnType<typeof useGenerateContent>

function createMutation(
  overrides: Partial<GenerateMutation> = {}
): GenerateMutation {
  return {
    isPending: false,
    data: undefined,
    ...overrides,
  } as GenerateMutation
}

describe('OutputViewer', () => {
  it('shows a skeleton while pending', async () => {
    const screen = await render(
      <OutputViewer generateContent={createMutation({ isPending: true })} />
    )

    await expect.element(screen.getByText('Output')).toBeInTheDocument()
  })

  it('shows an empty-state placeholder before anything has been generated', async () => {
    const screen = await render(
      <OutputViewer generateContent={createMutation()} />
    )

    await expect
      .element(screen.getByText(/Generated content will appear here/i))
      .toBeInTheDocument()
  })

  it('renders the generated output once available', async () => {
    const screen = await render(
      <OutputViewer
        generateContent={createMutation({
          data: {
            id: 'content-1',
            projectId: 'project-1',
            type: 'BLOG',
            prompt: 'Write about AI platforms',
            output: 'AI platforms are transforming how teams build software.',
            model: 'qwen2.5-coder:7b',
            createdAt: '',
            updatedAt: '',
          },
        })}
      />
    )

    await expect
      .element(
        screen.getByText(/AI platforms are transforming how teams build software/i)
      )
      .toBeInTheDocument()
  })
})

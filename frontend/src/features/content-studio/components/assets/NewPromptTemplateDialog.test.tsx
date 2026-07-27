import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { NewPromptTemplateDialog } from './NewPromptTemplateDialog'

vi.mock('../../hooks/use-create-saved-prompt', () => ({
  useCreateSavedPrompt: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('../../hooks/use-update-saved-prompt', () => ({
  useUpdateSavedPrompt: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

describe('NewPromptTemplateDialog', () => {
  it('renders the project-scoped SavePromptDialog in create mode', async () => {
    const screen = await render(
      <NewPromptTemplateDialog projectId='project-1' open onOpenChange={vi.fn()} />
    )

    await expect
      .element(screen.getByRole('heading', { name: 'New Prompt Template' }))
      .toBeInTheDocument()
  })

  it('renders nothing when closed', async () => {
    const screen = await render(
      <NewPromptTemplateDialog projectId='project-1' open={false} onOpenChange={vi.fn()} />
    )

    await expect
      .element(screen.getByRole('heading', { name: 'New Prompt Template' }))
      .not.toBeInTheDocument()
  })
})

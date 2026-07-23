import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'

import type { useGenerateContent } from '../../hooks/use-generate-content'
import type { PromptTemplate } from '../../types/prompt-template'
import type { SavedPrompt } from '../../types/saved-prompt'
import { GenerateForm } from './GenerateForm'

type GenerateMutation = ReturnType<typeof useGenerateContent>

const blogTemplate: PromptTemplate = {
  id: 'tpl-1',
  name: 'Blog Post',
  category: 'Blogging',
  contentType: 'BLOG',
  promptBody: 'Write a blog post about {{topic}} for {{business}}.',
  createdAt: '',
  updatedAt: '',
}

const seoSavedPrompt: SavedPrompt = {
  id: 'sp-1',
  userId: 'user-1',
  name: 'My SEO Prompt',
  promptBody: 'Write an SEO-optimized post about electric vehicles.',
  contentType: 'MARKETING_COPY',
  createdAt: '',
  updatedAt: '',
}

vi.mock('../../hooks/use-templates', () => ({
  useTemplates: () => ({
    data: [blogTemplate],
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('../../hooks/use-saved-prompts', () => ({
  useSavedPrompts: () => ({
    data: [seoSavedPrompt],
    isLoading: false,
    isError: false,
  }),
}))

function createMutation(
  overrides: Partial<GenerateMutation> = {}
): GenerateMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    data: undefined,
    ...overrides,
  } as GenerateMutation
}

describe('GenerateForm', () => {
  let screen: RenderResult
  let promptInput: Locator
  let generateButton: Locator
  let mutate: GenerateMutation['mutate']

  beforeEach(async () => {
    localStorage.clear()
    mutate = vi.fn() as GenerateMutation['mutate']

    screen = await render(
      <GenerateForm
        projectId='project-1'
        generateContent={createMutation({ mutate })}
      />
    )

    promptInput = screen.getByLabelText(/^Prompt$/i)
    generateButton = screen.getByRole('button', { name: /^Generate$/i })
  })

  it('defaults to the custom prompt workflow', async () => {
    await expect.element(promptInput).toBeInTheDocument()
    await expect.element(generateButton).toBeInTheDocument()
  })

  it('disables the generate button when the prompt is empty', async () => {
    await expect.element(generateButton).toBeDisabled()
  })

  it('submits the custom prompt with the selected content type', async () => {
    await userEvent.fill(promptInput, 'Write about AI platforms')
    await expect.element(generateButton).toBeEnabled()

    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      type: 'BLOG',
      prompt: 'Write about AI platforms',
    })
  })

  it('shows a pending state while generating', async () => {
    screen = await render(
      <GenerateForm
        projectId='project-1'
        generateContent={createMutation({ isPending: true })}
      />
    )

    const pendingButton = screen.getByRole('button', { name: /Generating/i })

    await expect.element(pendingButton).toBeInTheDocument()
    await expect.element(pendingButton).toBeDisabled()
  })

  it('shows an error message when generation fails', async () => {
    screen = await render(
      <GenerateForm
        projectId='project-1'
        generateContent={createMutation({ isError: true })}
      />
    )

    await expect
      .element(screen.getByText(/Failed to generate content/i))
      .toBeInTheDocument()
  })

  it('selecting a template swaps in variable fields and disables generate until filled', async () => {
    await userEvent.click(screen.getByText('Blog Post', { exact: true }))

    const topicField = screen.getByLabelText('topic', { exact: true })
    const businessField = screen.getByLabelText('business', { exact: true })

    await expect.element(topicField).toBeInTheDocument()
    await expect.element(businessField).toBeInTheDocument()
    await expect.element(generateButton).toBeDisabled()

    await userEvent.fill(topicField, 'renewable energy')
    await expect.element(generateButton).toBeDisabled()

    await userEvent.fill(businessField, 'Acme Corp')
    await expect.element(generateButton).toBeEnabled()

    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      type: 'BLOG',
      prompt: 'Write a blog post about renewable energy for Acme Corp.',
    })
  })

  it('preserves filled-in variable values when the same template is reselected', async () => {
    const templateCard = screen.getByRole('button', { name: /Blog Post/i })

    await userEvent.click(templateCard)

    await userEvent.fill(
      screen.getByLabelText('topic', { exact: true }),
      'renewable energy'
    )

    await userEvent.click(templateCard)

    await expect
      .element(screen.getByLabelText('topic', { exact: true }))
      .toHaveValue('renewable energy')
  })

  it('reusing a saved prompt fills in the custom prompt and content type', async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /My SEO Prompt/i })
    )

    await expect
      .element(promptInput)
      .toHaveValue('Write an SEO-optimized post about electric vehicles.')
    await expect.element(generateButton).toBeEnabled()

    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      type: 'MARKETING_COPY',
      prompt: 'Write an SEO-optimized post about electric vehicles.',
    })
  })

  it('remembers the last selected template across remounts', async () => {
    await userEvent.click(screen.getByText('Blog Post', { exact: true }))
    await expect
      .element(screen.getByLabelText('topic', { exact: true }))
      .toBeInTheDocument()

    screen = await render(
      <GenerateForm
        projectId='project-1'
        generateContent={createMutation({ mutate })}
      />
    )

    await expect
      .element(screen.getByLabelText('topic', { exact: true }))
      .toBeInTheDocument()
  })
})

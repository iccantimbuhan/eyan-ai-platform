import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { PromptTemplate } from '../../types/prompt-template'
import { TemplatePicker } from './TemplatePicker'

const blogTemplate: PromptTemplate = {
  id: 'tpl-1',
  name: 'Blog Post',
  category: 'Blogging',
  contentType: 'BLOG',
  promptBody: 'Write a blog post about {{topic}}.',
  createdAt: '',
  updatedAt: '',
}

const socialTemplate: PromptTemplate = {
  id: 'tpl-2',
  name: 'Facebook Post',
  category: 'Social Media',
  contentType: 'SOCIAL_MEDIA',
  promptBody: 'Write a Facebook post about {{topic}}.',
  createdAt: '',
  updatedAt: '',
}

const templates = [blogTemplate, socialTemplate]

let mockUseTemplates: () => {
  data: PromptTemplate[] | undefined
  isLoading: boolean
  isError: boolean
}

vi.mock('../../hooks/use-templates', () => ({
  useTemplates: () => mockUseTemplates(),
}))

function setTemplates(
  overrides: Partial<{
    data: PromptTemplate[] | undefined
    isLoading: boolean
    isError: boolean
  }> = {}
) {
  mockUseTemplates = () => ({
    data: templates,
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

describe('TemplatePicker', () => {
  it('shows a skeleton grid while loading', async () => {
    setTemplates({ isLoading: true, data: undefined })

    const screen = await render(
      <TemplatePicker
        selectedTemplateId={null}
        recentTemplateIds={[]}
        lastTemplateId={null}
        onSelect={vi.fn()}
      />
    )

    await expect
      .element(screen.getByText('Blog Post', { exact: true }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('tab', { name: 'All' }))
      .not.toBeInTheDocument()
  })

  it('shows an error message without blocking the custom prompt path', async () => {
    setTemplates({ isError: true, data: undefined })

    const screen = await render(
      <TemplatePicker
        selectedTemplateId={null}
        recentTemplateIds={[]}
        lastTemplateId={null}
        onSelect={vi.fn()}
      />
    )

    await expect
      .element(screen.getByText(/Failed to load templates/i))
      .toBeInTheDocument()
  })

  it('lists templates plus the Custom Prompt option under All', async () => {
    setTemplates()

    const screen = await render(
      <TemplatePicker
        selectedTemplateId={null}
        recentTemplateIds={[]}
        lastTemplateId={null}
        onSelect={vi.fn()}
      />
    )

    await expect
      .element(screen.getByText('Blog Post', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Facebook Post', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Custom Prompt', { exact: true }))
      .toBeInTheDocument()
  })

  it('filters by category tab', async () => {
    setTemplates()

    const screen = await render(
      <TemplatePicker
        selectedTemplateId={null}
        recentTemplateIds={[]}
        lastTemplateId={null}
        onSelect={vi.fn()}
      />
    )

    await userEvent.click(
      screen.getByRole('tab', { name: 'Social Media', exact: true })
    )

    await expect
      .element(screen.getByText('Facebook Post', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Blog Post', { exact: true }))
      .not.toBeInTheDocument()
  })

  it('shows a Recent tab only when there are recently used templates', async () => {
    setTemplates()

    const screen = await render(
      <TemplatePicker
        selectedTemplateId={null}
        recentTemplateIds={['tpl-2']}
        lastTemplateId={null}
        onSelect={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Recent' }))

    await expect
      .element(screen.getByText('Facebook Post', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Blog Post', { exact: true }))
      .not.toBeInTheDocument()
  })

  it('calls onSelect when a template card is clicked', async () => {
    setTemplates()
    const onSelect = vi.fn()

    const screen = await render(
      <TemplatePicker
        selectedTemplateId={null}
        recentTemplateIds={[]}
        lastTemplateId={null}
        onSelect={onSelect}
      />
    )

    await userEvent.click(screen.getByText('Blog Post', { exact: true }))

    expect(onSelect).toHaveBeenCalledWith(blogTemplate)
  })

  it('auto-restores the last-selected template once templates load', async () => {
    setTemplates()
    const onSelect = vi.fn()

    await render(
      <TemplatePicker
        selectedTemplateId={null}
        recentTemplateIds={[]}
        lastTemplateId='tpl-2'
        onSelect={onSelect}
      />
    )

    await expect
      .poll(() => onSelect.mock.calls.length)
      .toBeGreaterThan(0)
    expect(onSelect).toHaveBeenCalledWith(socialTemplate)
  })

  it('does not auto-restore when a template is already selected', async () => {
    setTemplates()
    const onSelect = vi.fn()

    await render(
      <TemplatePicker
        selectedTemplateId='tpl-1'
        recentTemplateIds={[]}
        lastTemplateId='tpl-2'
        onSelect={onSelect}
      />
    )

    expect(onSelect).not.toHaveBeenCalled()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { PromptTemplate } from '../../types/prompt-template'
import { TemplateCard } from './TemplateCard'

const template: PromptTemplate = {
  id: 'tpl-1',
  name: 'Blog Post',
  category: 'Blogging',
  contentType: 'BLOG',
  promptBody: 'Write a blog post about {{topic}} for {{business}}.',
  createdAt: '',
  updatedAt: '',
}

describe('TemplateCard', () => {
  it('renders the template name, category, and prompt snippet', async () => {
    const screen = await render(
      <TemplateCard template={template} isSelected={false} onSelect={vi.fn()} />
    )

    await expect
      .element(screen.getByText('Blog Post', { exact: true }))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Blogging')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/Write a blog post about/i))
      .toBeInTheDocument()
  })

  it('calls onSelect with the template when clicked', async () => {
    const onSelect = vi.fn()
    const screen = await render(
      <TemplateCard template={template} isSelected={false} onSelect={onSelect} />
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onSelect).toHaveBeenCalledWith(template)
  })

  it('calls onSelect when activated with the keyboard', async () => {
    const onSelect = vi.fn()
    const screen = await render(
      <TemplateCard template={template} isSelected={false} onSelect={onSelect} />
    )

    const card = screen.getByRole('button')
    await card.element().focus()
    await userEvent.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(template)
  })

  it('reflects selection state via aria-pressed', async () => {
    const screen = await render(
      <TemplateCard template={template} isSelected onSelect={vi.fn()} />
    )

    await expect
      .element(screen.getByRole('button'))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the custom-prompt description instead of a snippet for the custom option', async () => {
    const customTemplate: PromptTemplate = {
      ...template,
      id: 'custom',
      name: 'Custom Prompt',
      isCustom: true,
    }

    const screen = await render(
      <TemplateCard
        template={customTemplate}
        isSelected={false}
        onSelect={vi.fn()}
      />
    )

    await expect
      .element(screen.getByText('Write your own prompt from scratch.'))
      .toBeInTheDocument()
  })
})

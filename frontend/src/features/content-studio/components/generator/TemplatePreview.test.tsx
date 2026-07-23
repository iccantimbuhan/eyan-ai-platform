import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'

import type { PromptTemplate } from '../../types/prompt-template'
import { TemplatePreview } from './TemplatePreview'

const template: PromptTemplate = {
  id: 'tpl-1',
  name: 'Blog Post',
  category: 'Blogging',
  contentType: 'BLOG',
  promptBody: 'Write a blog post about {{topic}} for {{business}}.',
  createdAt: '',
  updatedAt: '',
}

describe('TemplatePreview', () => {
  it('shows a placeholder when no template is selected', async () => {
    const screen = await render(<TemplatePreview template={null} />)

    await expect
      .element(screen.getByText('Select a template to preview it here.'))
      .toBeInTheDocument()
  })

  it('renders the template name, category, content type, and highlighted variables', async () => {
    const screen = await render(<TemplatePreview template={template} />)

    await expect
      .element(screen.getByText('Blog Post', { exact: true }))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Blogging')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/Generates: Blog/i))
      .toBeInTheDocument()
    await expect.element(screen.getByText('{{topic}}')).toBeInTheDocument()
    await expect.element(screen.getByText('{{business}}')).toBeInTheDocument()
  })

  it('shows a custom-prompt message instead of a prompt body for the custom option', async () => {
    const customTemplate: PromptTemplate = {
      ...template,
      isCustom: true,
    }

    const screen = await render(<TemplatePreview template={customTemplate} />)

    await expect
      .element(
        screen.getByText(
          'Write your own prompt from scratch. No template will be applied.'
        )
      )
      .toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { PromptTemplate } from '../types/prompt-template'
import { useRecentTemplates } from './use-recent-templates'

function makeTemplate(id: string, isCustom = false): PromptTemplate {
  return {
    id,
    name: id,
    category: 'Blogging',
    contentType: 'BLOG',
    promptBody: '',
    createdAt: '',
    updatedAt: '',
    ...(isCustom ? { isCustom: true } : {}),
  }
}

function Host() {
  const { lastTemplateId, recentTemplateIds, recordTemplateUse } =
    useRecentTemplates()

  return (
    <div>
      <span data-testid='last'>{lastTemplateId ?? 'none'}</span>
      <span data-testid='recent'>{recentTemplateIds.join(',')}</span>
      <button onClick={() => recordTemplateUse(makeTemplate('tpl-1'))}>
        select
      </button>
      <button onClick={() => recordTemplateUse(makeTemplate('custom', true))}>
        select-custom
      </button>
    </div>
  )
}

describe('useRecentTemplates', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with no last template and an empty recent list', async () => {
    const screen = await render(<Host />)

    await expect.element(screen.getByTestId('last')).toHaveTextContent('none')
    await expect.element(screen.getByTestId('recent')).toHaveTextContent('')
  })

  it('records a real template as both last-selected and most-recent', async () => {
    const screen = await render(<Host />)
    await userEvent.click(
      screen.getByRole('button', { name: 'select', exact: true })
    )

    await expect.element(screen.getByTestId('last')).toHaveTextContent('tpl-1')
    await expect
      .element(screen.getByTestId('recent'))
      .toHaveTextContent('tpl-1')

    expect(localStorage.getItem('content-studio:last-template-id')).toBe(
      'tpl-1'
    )
    expect(
      JSON.parse(localStorage.getItem('content-studio:recent-template-ids')!)
    ).toEqual(['tpl-1'])
  })

  it('remembers the custom prompt as last-selected but excludes it from recents', async () => {
    const screen = await render(<Host />)
    await userEvent.click(screen.getByRole('button', { name: 'select-custom' }))

    await expect.element(screen.getByTestId('last')).toHaveTextContent('custom')
    await expect.element(screen.getByTestId('recent')).toHaveTextContent('')
  })

  it('moves a re-selected template to the front instead of duplicating it', async () => {
    function MultiHost() {
      const { recentTemplateIds, recordTemplateUse } = useRecentTemplates()

      return (
        <div>
          <span data-testid='recent'>{recentTemplateIds.join(',')}</span>
          <button onClick={() => recordTemplateUse(makeTemplate('tpl-1'))}>
            a
          </button>
          <button onClick={() => recordTemplateUse(makeTemplate('tpl-2'))}>
            b
          </button>
        </div>
      )
    }

    const screen = await render(<MultiHost />)
    await userEvent.click(screen.getByRole('button', { name: 'a' }))
    await userEvent.click(screen.getByRole('button', { name: 'b' }))
    await userEvent.click(screen.getByRole('button', { name: 'a' }))

    await expect
      .element(screen.getByTestId('recent'))
      .toHaveTextContent('tpl-1,tpl-2')
  })

  it('caps the recent list at 5 entries', async () => {
    function MultiHost() {
      const { recentTemplateIds, recordTemplateUse } = useRecentTemplates()

      return (
        <div>
          <span data-testid='recent'>{recentTemplateIds.join(',')}</span>
          {['t1', 't2', 't3', 't4', 't5', 't6'].map((id) => (
            <button key={id} onClick={() => recordTemplateUse(makeTemplate(id))}>
              {id}
            </button>
          ))}
        </div>
      )
    }

    const screen = await render(<MultiHost />)
    for (const id of ['t1', 't2', 't3', 't4', 't5', 't6']) {
      await userEvent.click(screen.getByRole('button', { name: id }))
    }

    await expect
      .element(screen.getByTestId('recent'))
      .toHaveTextContent('t6,t5,t4,t3,t2')
  })
})

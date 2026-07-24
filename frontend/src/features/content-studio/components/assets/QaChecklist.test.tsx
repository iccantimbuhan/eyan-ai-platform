import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { ChecklistItemValue } from '../../types/asset'
import { QaChecklist } from './QaChecklist'

describe('QaChecklist', () => {
  it('renders the content checklist items for a content asset type', async () => {
    const screen = await render(
      <QaChecklist assetType='BLOG' value={[]} onChange={vi.fn()} />
    )

    for (const item of ['Grammar', 'Brand Consistency', 'Tone', 'Readability']) {
      await expect.element(screen.getByText(item, { exact: true })).toBeInTheDocument()
    }
  })

  it('renders the images checklist items for an IMAGE asset', async () => {
    const screen = await render(
      <QaChecklist assetType='IMAGE' value={[]} onChange={vi.fn()} />
    )

    for (const item of ['Prompt Accuracy', 'Composition', 'Visual Quality', 'Safety']) {
      await expect.element(screen.getByText(item, { exact: true })).toBeInTheDocument()
    }
  })

  it('reuses the content checklist for a PROMPT_TEMPLATE asset', async () => {
    const screen = await render(
      <QaChecklist assetType='PROMPT_TEMPLATE' value={[]} onChange={vi.fn()} />
    )

    await expect.element(screen.getByText('Grammar', { exact: true })).toBeInTheDocument()
  })

  it('calls onChange with PASS when the Pass button for the first item is clicked', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <QaChecklist assetType='BLOG' value={[]} onChange={onChange} />
    )

    // Grammar is the first item in the content checklist, so it's the first
    // "Pass" button in document order.
    const passButton = screen.getByRole('button', { name: 'Pass' }).first()
    await userEvent.click(passButton)

    expect(onChange).toHaveBeenCalledWith([
      { category: 'content', item: 'Grammar', result: 'PASS' },
    ])
  })

  it('toggles a PASS result back to null when clicked again', async () => {
    const onChange = vi.fn()
    const value: ChecklistItemValue[] = [
      { category: 'content', item: 'Grammar', result: 'PASS' },
    ]
    const screen = await render(
      <QaChecklist assetType='BLOG' value={value} onChange={onChange} />
    )

    const passButton = screen.getByRole('button', { name: 'Pass' }).first()
    await userEvent.click(passButton)

    expect(onChange).toHaveBeenCalledWith([
      { category: 'content', item: 'Grammar', result: null },
    ])
  })

  it('includes a comment in the updated value when typed', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <QaChecklist assetType='BLOG' value={[]} onChange={onChange} />
    )

    const commentBox = screen.getByLabelText('Comment for Grammar')
    await userEvent.fill(commentBox, 'Needs a comma')

    expect(onChange).toHaveBeenCalledWith([
      { category: 'content', item: 'Grammar', result: null, comment: 'Needs a comma' },
    ])
  })
})

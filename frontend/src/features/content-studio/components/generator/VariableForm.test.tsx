import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import { VariableForm } from './VariableForm'

describe('VariableForm', () => {
  it('renders nothing when there are no variables', async () => {
    const screen = await render(
      <VariableForm variables={[]} values={{}} onChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders a labeled input for each variable', async () => {
    const screen = await render(
      <VariableForm
        variables={['topic', 'business']}
        values={{}}
        onChange={vi.fn()}
      />
    )

    await expect
      .element(screen.getByLabelText('topic', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByLabelText('business', { exact: true }))
      .toBeInTheDocument()
  })

  it('reflects the current value for each variable', async () => {
    const screen = await render(
      <VariableForm
        variables={['topic']}
        values={{ topic: 'renewable energy' }}
        onChange={vi.fn()}
      />
    )

    await expect
      .element(screen.getByLabelText('topic', { exact: true }))
      .toHaveValue('renewable energy')
  })

  it('calls onChange with the variable name and new value', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <VariableForm variables={['topic']} values={{}} onChange={onChange} />
    )

    await userEvent.fill(
      screen.getByLabelText('topic', { exact: true }),
      'AI platforms'
    )

    expect(onChange).toHaveBeenLastCalledWith('topic', 'AI platforms')
  })
})

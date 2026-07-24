import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useImageProviderPreference } from './use-image-provider-preference'

function Host() {
  const { provider, setProvider } = useImageProviderPreference()

  return (
    <div>
      <span data-testid='provider'>{provider}</span>
      <button onClick={() => setProvider('comfyui')}>select-comfyui</button>
      <button onClick={() => setProvider('huggingface')}>
        select-huggingface
      </button>
    </div>
  )
}

describe('useImageProviderPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to "auto" when nothing is stored', async () => {
    const screen = await render(<Host />)

    await expect
      .element(screen.getByTestId('provider'))
      .toHaveTextContent('auto')
  })

  it('persists a selected provider to localStorage', async () => {
    const screen = await render(<Host />)
    await userEvent.click(
      screen.getByRole('button', { name: 'select-comfyui' })
    )

    await expect
      .element(screen.getByTestId('provider'))
      .toHaveTextContent('comfyui')
    expect(localStorage.getItem('content-studio:image-provider')).toBe(
      'comfyui'
    )
  })

  it('reads a previously stored valid provider on mount', async () => {
    localStorage.setItem('content-studio:image-provider', 'huggingface')

    const screen = await render(<Host />)

    await expect
      .element(screen.getByTestId('provider'))
      .toHaveTextContent('huggingface')
  })

  it('falls back to "auto" for a corrupted/invalid stored value', async () => {
    localStorage.setItem('content-studio:image-provider', 'not-a-provider')

    const screen = await render(<Host />)

    await expect
      .element(screen.getByTestId('provider'))
      .toHaveTextContent('auto')
  })

  it('overwrites a previous selection with the latest one', async () => {
    const screen = await render(<Host />)
    await userEvent.click(
      screen.getByRole('button', { name: 'select-comfyui' })
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'select-huggingface' })
    )

    await expect
      .element(screen.getByTestId('provider'))
      .toHaveTextContent('huggingface')
    expect(localStorage.getItem('content-studio:image-provider')).toBe(
      'huggingface'
    )
  })
})

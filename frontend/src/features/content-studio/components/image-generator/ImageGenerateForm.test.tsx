import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import type { useGenerateImage } from '../../hooks/use-generate-image'
import type { ImageProviderOption } from '../../types/image'
import { ImageGenerateForm } from './ImageGenerateForm'

type GenerateMutation = ReturnType<typeof useGenerateImage>

function createMutation(
  overrides: Partial<GenerateMutation> = {}
): GenerateMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as GenerateMutation
}

function renderForm(
  overrides: {
    generateImage?: GenerateMutation
    provider?: ImageProviderOption
    onProviderChange?: (provider: ImageProviderOption) => void
  } = {}
) {
  return render(
    <ImageGenerateForm
      projectId='project-1'
      generateImage={overrides.generateImage ?? createMutation()}
      provider={overrides.provider ?? 'auto'}
      onProviderChange={overrides.onProviderChange ?? vi.fn()}
    />
  )
}

describe('ImageGenerateForm', () => {
  let screen: RenderResult
  let promptInput: Locator
  let generateButton: Locator
  let mutate: GenerateMutation['mutate']

  it('renders the prompt field, provider selector, and generate button', async () => {
    screen = await renderForm()
    promptInput = screen.getByLabelText(/^Prompt$/i)
    generateButton = screen.getByRole('button', { name: /^Generate$/i })

    await expect.element(promptInput).toBeInTheDocument()
    await expect
      .element(screen.getByText('Auto (server default)'))
      .toBeInTheDocument()
    await expect.element(generateButton).toBeInTheDocument()
  })

  it('lists all five providers, including Fake', async () => {
    screen = await renderForm()

    await userEvent.click(screen.getByRole('combobox'))

    for (const label of [
      'Auto (server default)',
      'Gemini',
      'ComfyUI',
      'Hugging Face',
      'Fake (testing)',
    ]) {
      await expect
        .element(screen.getByRole('option', { name: label }))
        .toBeInTheDocument()
    }
  })

  it('disables the generate button when the prompt is empty', async () => {
    screen = await renderForm()
    generateButton = screen.getByRole('button', { name: /^Generate$/i })

    await expect.element(generateButton).toBeDisabled()
  })

  it('submits without a provider override when "Auto" is selected', async () => {
    mutate = vi.fn() as GenerateMutation['mutate']
    screen = await renderForm({ generateImage: createMutation({ mutate }) })
    promptInput = screen.getByLabelText(/^Prompt$/i)
    generateButton = screen.getByRole('button', { name: /^Generate$/i })

    await userEvent.fill(promptInput, 'A lighthouse at sunset')
    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      prompt: 'A lighthouse at sunset',
    })
  })

  it('submits the given provider override', async () => {
    mutate = vi.fn() as GenerateMutation['mutate']
    screen = await renderForm({
      generateImage: createMutation({ mutate }),
      provider: 'huggingface',
    })
    promptInput = screen.getByLabelText(/^Prompt$/i)
    generateButton = screen.getByRole('button', { name: /^Generate$/i })

    await userEvent.fill(promptInput, 'A lighthouse at sunset')
    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      prompt: 'A lighthouse at sunset',
      provider: 'huggingface',
    })
  })

  it('calls onProviderChange when a new provider is selected', async () => {
    const onProviderChange = vi.fn()
    screen = await renderForm({ onProviderChange })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('ComfyUI', { exact: true }))

    expect(onProviderChange).toHaveBeenCalledWith('comfyui')
  })

  it('shows a pending state while generating', async () => {
    screen = await renderForm({
      generateImage: createMutation({ isPending: true }),
    })

    const pendingButton = screen.getByRole('button', { name: /Generating/i })

    await expect.element(pendingButton).toBeInTheDocument()
    await expect.element(pendingButton).toBeDisabled()
  })

  it('shows the server-provided error message, prefixed with the selected provider', async () => {
    const axiosError = new AxiosError(
      'Request failed with status code 502',
      '502',
      undefined,
      undefined,
      {
        status: 502,
        statusText: 'Bad Gateway',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: {
          success: false,
          error:
            'Image generation failed. Please try again, or try a different provider.',
        },
      }
    )

    screen = await renderForm({
      generateImage: createMutation({ isError: true, error: axiosError }),
      provider: 'comfyui',
    })

    await expect
      .element(
        screen.getByText(
          /ComfyUI: Image generation failed\. Please try again, or try a different provider\./i
        )
      )
      .toBeInTheDocument()
  })

  it('does not prefix the error message when the provider is "Auto"', async () => {
    const axiosError = new AxiosError(
      'Request failed with status code 502',
      '502',
      undefined,
      undefined,
      {
        status: 502,
        statusText: 'Bad Gateway',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { success: false, error: 'Image generation failed.' },
      }
    )

    screen = await renderForm({
      generateImage: createMutation({ isError: true, error: axiosError }),
      provider: 'auto',
    })

    const message = screen.getByText(/Image generation failed\./i)
    await expect.element(message).toBeInTheDocument()
    await expect.element(message).not.toHaveTextContent(/^Auto/)
  })

  it('falls back to a generic error message when the failure has no server-provided message', async () => {
    screen = await renderForm({
      generateImage: createMutation({
        isError: true,
        error: new Error('Network Error'),
      }),
      provider: 'huggingface',
    })

    await expect
      .element(
        screen.getByText(
          /Hugging Face: Failed to generate image\. Please try again\./i
        )
      )
      .toBeInTheDocument()
  })
})

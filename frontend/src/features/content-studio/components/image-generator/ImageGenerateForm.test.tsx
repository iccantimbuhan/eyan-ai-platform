import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import type { useGenerateImage } from '../../hooks/use-generate-image'
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

describe('ImageGenerateForm', () => {
  let screen: RenderResult
  let promptInput: Locator
  let generateButton: Locator
  let mutate: GenerateMutation['mutate']

  beforeEach(async () => {
    localStorage.clear()
    mutate = vi.fn() as GenerateMutation['mutate']

    screen = await render(
      <ImageGenerateForm
        projectId='project-1'
        generateImage={createMutation({ mutate })}
      />
    )

    promptInput = screen.getByLabelText(/^Prompt$/i)
    generateButton = screen.getByRole('button', { name: /^Generate$/i })
  })

  it('renders the prompt field, provider selector, and generate button', async () => {
    await expect.element(promptInput).toBeInTheDocument()
    await expect
      .element(screen.getByText('Auto (server default)'))
      .toBeInTheDocument()
    await expect.element(generateButton).toBeInTheDocument()
  })

  it('disables the generate button when the prompt is empty', async () => {
    await expect.element(generateButton).toBeDisabled()
  })

  it('submits without a provider override when "Auto" is selected', async () => {
    await userEvent.fill(promptInput, 'A lighthouse at sunset')
    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      prompt: 'A lighthouse at sunset',
    })
  })

  it('submits the selected provider override', async () => {
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('ComfyUI', { exact: true }))

    await userEvent.fill(promptInput, 'A lighthouse at sunset')
    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      prompt: 'A lighthouse at sunset',
      provider: 'comfyui',
    })
  })

  it('persists the selected provider across remounts', async () => {
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Gemini', { exact: true }))

    await screen.unmount()

    screen = await render(
      <ImageGenerateForm
        projectId='project-1'
        generateImage={createMutation({ mutate })}
      />
    )

    await expect
      .element(screen.getByText('Gemini', { exact: true }))
      .toBeInTheDocument()
  })

  it('shows a pending state while generating', async () => {
    screen = await render(
      <ImageGenerateForm
        projectId='project-1'
        generateImage={createMutation({ isPending: true })}
      />
    )

    const pendingButton = screen.getByRole('button', { name: /Generating/i })

    await expect.element(pendingButton).toBeInTheDocument()
    await expect.element(pendingButton).toBeDisabled()
  })

  it('shows the server-provided error message when generation fails', async () => {
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

    screen = await render(
      <ImageGenerateForm
        projectId='project-1'
        generateImage={createMutation({ isError: true, error: axiosError })}
      />
    )

    await expect
      .element(
        screen.getByText(
          /Image generation failed\. Please try again, or try a different provider\./i
        )
      )
      .toBeInTheDocument()
  })

  it('falls back to a generic error message when the failure has no server-provided message', async () => {
    screen = await render(
      <ImageGenerateForm
        projectId='project-1'
        generateImage={createMutation({
          isError: true,
          error: new Error('Network Error'),
        })}
      />
    )

    await expect
      .element(
        screen.getByText(/Failed to generate image\. Please try again\./i)
      )
      .toBeInTheDocument()
  })
})

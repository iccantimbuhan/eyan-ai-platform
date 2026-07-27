import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import type { useGenerateVideoAsset } from '../../hooks/use-generate-video-asset'
import { VideoGenerateForm } from './VideoGenerateForm'

type GenerateMutation = ReturnType<typeof useGenerateVideoAsset>

const useBrandKitsMock = vi.fn()
vi.mock('../../hooks/use-brand-kits', () => ({
  useBrandKits: (...args: unknown[]) => useBrandKitsMock(...args),
}))

const useVideoAssetsMock = vi.fn()
vi.mock('../../hooks/use-video-assets', () => ({
  useVideoAssets: (...args: unknown[]) => useVideoAssetsMock(...args),
}))

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

function renderForm(overrides: { generateVideoAsset?: GenerateMutation } = {}) {
  return render(
    <VideoGenerateForm
      projectId='project-1'
      generateVideoAsset={overrides.generateVideoAsset ?? createMutation()}
    />
  )
}

describe('VideoGenerateForm', () => {
  let screen: RenderResult
  let promptInput: Locator
  let generateButton: Locator
  let mutate: GenerateMutation['mutate']

  beforeEach(() => {
    useBrandKitsMock.mockReturnValue({ data: [], isLoading: false })
    useVideoAssetsMock.mockReturnValue({
      data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
      isLoading: false,
    })
  })

  it('renders the prompt field, artifact type selector, and generate button', async () => {
    screen = await renderForm()
    promptInput = screen.getByLabelText(/^Prompt$/i)
    generateButton = screen.getByRole('button', { name: /^Generate$/i })

    await expect.element(promptInput).toBeInTheDocument()
    await expect.element(screen.getByText('Script')).toBeInTheDocument()
    await expect.element(generateButton).toBeInTheDocument()
  })

  it('lists both text and visual artifact kinds', async () => {
    screen = await renderForm()

    await userEvent.click(screen.getByLabelText(/Artifact type/i))

    for (const label of [
      'Scene Breakdown',
      'Shot List',
      'Voice-over Script',
      'Captions',
      'Subtitles',
      'Storyboard',
      'Thumbnail',
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

  it('submits with the default SCRIPT kind and a fresh video (no videoGroupId)', async () => {
    mutate = vi.fn() as GenerateMutation['mutate']
    screen = await renderForm({ generateVideoAsset: createMutation({ mutate }) })
    promptInput = screen.getByLabelText(/^Prompt$/i)
    generateButton = screen.getByRole('button', { name: /^Generate$/i })

    await userEvent.fill(promptInput, 'A rocket launch video')
    await userEvent.click(generateButton)

    expect(mutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      kind: 'SCRIPT',
      prompt: 'A rocket launch video',
    })
  })

  it('attaches to an existing video when one is selected', async () => {
    useVideoAssetsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'video-1',
            projectId: 'project-1',
            brandKitId: null,
            videoGroupId: 'group-12345678',
            kind: 'SCRIPT',
            prompt: 'x',
            output: 'x',
            provider: null,
            width: null,
            height: null,
            format: null,
            storagePath: null,
            thumbnailPath: null,
            model: 'qwen2.5',
            status: 'COMPLETED',
            errorMessage: null,
            generationTimeMs: 100,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
    })

    mutate = vi.fn() as GenerateMutation['mutate']
    screen = await renderForm({ generateVideoAsset: createMutation({ mutate }) })
    promptInput = screen.getByLabelText(/^Prompt$/i)

    await userEvent.click(screen.getByLabelText(/^Video$/i))
    await userEvent.click(screen.getByText(/Video group-12/i))
    await userEvent.fill(promptInput, 'A storyboard frame')
    await userEvent.click(screen.getByRole('button', { name: /^Generate$/i }))

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ videoGroupId: 'group-12345678' })
    )
  })

  it('shows a pending state while generating', async () => {
    screen = await renderForm({
      generateVideoAsset: createMutation({ isPending: true }),
    })

    const pendingButton = screen.getByRole('button', { name: /Generating/i })

    await expect.element(pendingButton).toBeInTheDocument()
    await expect.element(pendingButton).toBeDisabled()
  })

  it('shows the server-provided error message', async () => {
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
            'Video asset generation failed. Please try again, or try a different provider.',
        },
      }
    )

    screen = await renderForm({
      generateVideoAsset: createMutation({ isError: true, error: axiosError }),
    })

    await expect
      .element(
        screen.getByText(
          /Video asset generation failed\. Please try again, or try a different provider\./i
        )
      )
      .toBeInTheDocument()
  })
})

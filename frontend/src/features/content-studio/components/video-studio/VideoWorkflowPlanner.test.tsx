import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { usePlanVideoWorkflow } from '../../hooks/use-plan-video-workflow'
import { VideoWorkflowPlanner } from './VideoWorkflowPlanner'

type PlanMutation = ReturnType<typeof usePlanVideoWorkflow>

const useVideoAssetsMock = vi.fn()
vi.mock('../../hooks/use-video-assets', () => ({
  useVideoAssets: (...args: unknown[]) => useVideoAssetsMock(...args),
}))

const UPLOADED_SOURCE = {
  id: 'video-1',
  projectId: 'project-1',
  brandKitId: null,
  videoGroupId: 'group-1',
  kind: 'UPLOADED_SOURCE',
  prompt: 'my-video.mp4',
  output: null,
  provider: 'upload',
  width: 1920,
  height: 1080,
  format: null,
  storagePath: 'project-1/uuid.mp4',
  thumbnailPath: null,
  model: null,
  status: 'COMPLETED',
  errorMessage: null,
  generationTimeMs: null,
  durationMs: 12500,
  videoFormat: 'mp4',
  sourceFileName: 'my-video.mp4',
  subtitlePath: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createMutation(overrides: Partial<PlanMutation> = {}): PlanMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as PlanMutation
}

function renderPlanner(overrides: { planWorkflow?: PlanMutation } = {}) {
  return render(
    <VideoWorkflowPlanner
      projectId='project-1'
      planWorkflow={overrides.planWorkflow ?? createMutation()}
    />
  )
}

describe('VideoWorkflowPlanner', () => {
  beforeEach(() => {
    useVideoAssetsMock.mockReturnValue({
      data: {
        items: [UPLOADED_SOURCE],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
    })
  })

  it('renders the prompt field, source selector, and Generate Plan button', async () => {
    const screen = await renderPlanner()

    await expect
      .element(screen.getByLabelText(/Describe the edit/i))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /Generate Plan/i }))
      .toBeInTheDocument()
  })

  it('only lists uploaded video-file sources, not text/image artifacts', async () => {
    useVideoAssetsMock.mockReturnValue({
      data: {
        items: [
          UPLOADED_SOURCE,
          { ...UPLOADED_SOURCE, id: 'video-2', kind: 'SCRIPT', sourceFileName: null },
        ],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
    })

    const screen = await renderPlanner()
    await userEvent.click(screen.getByLabelText(/Source video/i))

    await expect.element(screen.getByText('my-video.mp4')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'video-2' }).query()).toBeNull()
  })

  it('disables Generate Plan until both a source and a prompt are provided', async () => {
    const screen = await renderPlanner()
    const generateButton = screen.getByRole('button', { name: /Generate Plan/i })

    await expect.element(generateButton).toBeDisabled()

    await userEvent.click(screen.getByLabelText(/Source video/i))
    await userEvent.click(screen.getByText('my-video.mp4'))

    await expect.element(generateButton).toBeDisabled()

    await userEvent.fill(
      screen.getByLabelText(/Describe the edit/i),
      'Remove silence and add subtitles'
    )

    await expect.element(generateButton).toBeEnabled()
  })

  it('submits the selected videoAssetId and trimmed prompt to the mutation', async () => {
    const mutate = vi.fn() as PlanMutation['mutate']
    const screen = await renderPlanner({ planWorkflow: createMutation({ mutate }) })

    await userEvent.click(screen.getByLabelText(/Source video/i))
    await userEvent.click(screen.getByText('my-video.mp4'))
    await userEvent.fill(
      screen.getByLabelText(/Describe the edit/i),
      '  Remove silence and add subtitles  '
    )
    await userEvent.click(screen.getByRole('button', { name: /Generate Plan/i }))

    expect(mutate).toHaveBeenCalledWith({
      videoAssetId: 'video-1',
      prompt: 'Remove silence and add subtitles',
    })
  })

  it('shows a pending state while generating', async () => {
    const screen = await renderPlanner({
      planWorkflow: createMutation({ isPending: true }),
    })

    const pendingButton = screen.getByRole('button', { name: /Generating plan/i })
    await expect.element(pendingButton).toBeInTheDocument()
    await expect.element(pendingButton).toBeDisabled()
  })

  it('shows the server-provided error message', async () => {
    const axiosError = new AxiosError(
      'Request failed with status code 422',
      '422',
      undefined,
      undefined,
      {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: {
          success: false,
          error: 'Could not generate a valid editing plan for that request.',
        },
      }
    )

    const screen = await renderPlanner({
      planWorkflow: createMutation({ isError: true, error: axiosError }),
    })

    await expect
      .element(screen.getByText(/Could not generate a valid editing plan/i))
      .toBeInTheDocument()
  })

  it('renders the ordered step preview once a plan has been generated', async () => {
    const screen: RenderResult = await renderPlanner({
      planWorkflow: createMutation({
        data: {
          id: 'plan-1',
          projectId: 'project-1',
          videoAssetId: 'video-1',
          prompt: 'Remove silence and add subtitles',
          resultVideoAssetId: null,
          executedAt: null,
          workflow: {
            steps: [
              { operation: 'remove_silence', params: {} },
              { operation: 'resize', params: { aspectRatio: '9:16' } },
              { operation: 'subtitles', params: { language: 'auto' } },
            ],
          },
          model: 'qwen2.5-coder:7b',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    })

    await expect.element(screen.getByText('Plan preview')).toBeInTheDocument()
    await expect.element(screen.getByText('Remove Silence')).toBeInTheDocument()
    await expect.element(screen.getByText('Resize')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/aspectRatio: 9:16/))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Subtitles')).toBeInTheDocument()
  })
})

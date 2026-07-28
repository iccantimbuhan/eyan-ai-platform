import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { useExecuteWorkflow } from '../../hooks/use-execute-workflow'
import type { VideoAsset } from '../../types/video-asset'
import { VideoWorkflowExecutor } from './VideoWorkflowExecutor'

type ExecuteMutation = ReturnType<typeof useExecuteWorkflow>

const useVideoWorkflowPlansMock = vi.fn()
vi.mock('../../hooks/use-video-workflow-plans', () => ({
  useVideoWorkflowPlans: (...args: unknown[]) => useVideoWorkflowPlansMock(...args),
}))

const useVideoAssetsMock = vi.fn()
vi.mock('../../hooks/use-video-assets', () => ({
  useVideoAssets: (...args: unknown[]) => useVideoAssetsMock(...args),
}))

const PLAN = {
  id: 'plan-1',
  projectId: 'project-1',
  videoAssetId: 'video-1',
  prompt: 'Remove silence and resize to 9:16',
  workflow: { steps: [{ operation: 'remove_silence', params: {} }] },
  model: 'qwen2.5-coder:7b',
  resultVideoAssetId: null,
  executedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const SOURCE_ASSET: VideoAsset = {
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

function createMutation(overrides: Partial<ExecuteMutation> = {}): ExecuteMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as ExecuteMutation
}

function renderExecutor(overrides: { executeWorkflow?: ExecuteMutation } = {}) {
  return render(
    <VideoWorkflowExecutor
      projectId='project-1'
      executeWorkflow={overrides.executeWorkflow ?? createMutation()}
    />
  )
}

describe('VideoWorkflowExecutor', () => {
  beforeEach(() => {
    useVideoWorkflowPlansMock.mockReturnValue({ data: [PLAN], isLoading: false })
    useVideoAssetsMock.mockReturnValue({
      data: { items: [SOURCE_ASSET], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
      isLoading: false,
    })
  })

  it('renders the workflow selector and Execute Workflow button', async () => {
    const screen = await renderExecutor()

    await expect.element(screen.getByLabelText(/^Workflow$/i)).toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /Execute Workflow/i }))
      .toBeInTheDocument()
  })

  it('lists each plan with its source file name and prompt', async () => {
    const screen = await renderExecutor()

    await userEvent.click(screen.getByLabelText(/^Workflow$/i))

    await expect
      .element(screen.getByText(/my-video\.mp4.*Remove silence and resize/))
      .toBeInTheDocument()
  })

  it('marks an already-executed plan in its label', async () => {
    useVideoWorkflowPlansMock.mockReturnValue({
      data: [{ ...PLAN, resultVideoAssetId: 'video-2', executedAt: '2026-01-02T00:00:00.000Z' }],
      isLoading: false,
    })

    const screen = await renderExecutor()
    await userEvent.click(screen.getByLabelText(/^Workflow$/i))

    await expect.element(screen.getByText(/already executed/i)).toBeInTheDocument()
  })

  it('disables Execute Workflow until a plan is selected', async () => {
    const screen = await renderExecutor()
    const executeButton = screen.getByRole('button', { name: /Execute Workflow/i })

    await expect.element(executeButton).toBeDisabled()

    await userEvent.click(screen.getByLabelText(/^Workflow$/i))
    await userEvent.click(screen.getByRole('option', { name: /my-video\.mp4/i }))

    await expect.element(executeButton).toBeEnabled()
  })

  it('submits the selected workflowPlanId to the mutation', async () => {
    const mutate = vi.fn() as ExecuteMutation['mutate']
    const screen = await renderExecutor({ executeWorkflow: createMutation({ mutate }) })

    await userEvent.click(screen.getByLabelText(/^Workflow$/i))
    await userEvent.click(screen.getByRole('option', { name: /my-video\.mp4/i }))
    await userEvent.click(screen.getByRole('button', { name: /Execute Workflow/i }))

    expect(mutate).toHaveBeenCalledWith({ workflowPlanId: 'plan-1' })
  })

  it('shows a pending state while executing', async () => {
    const screen = await renderExecutor({
      executeWorkflow: createMutation({ isPending: true }),
    })

    const pendingButton = screen.getByRole('button', { name: /Executing/i })
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
          error: 'Execution failed at step 1 ("remove_silence"). No edited video was produced.',
        },
      }
    )

    const screen = await renderExecutor({
      executeWorkflow: createMutation({ isError: true, error: axiosError }),
    })

    await expect
      .element(screen.getByText(/Execution failed at step 1/i))
      .toBeInTheDocument()
  })

  const EDITED_ASSET: VideoAsset = {
    id: 'video-2',
    projectId: 'project-1',
    brandKitId: null,
    videoGroupId: 'group-1',
    kind: 'EDITED_VIDEO',
    prompt: 'Remove silence and resize to 9:16',
    output: null,
    provider: 'ffmpeg',
    width: 1080,
    height: 1920,
    format: null,
    storagePath: 'project-1/edited.mp4',
    thumbnailPath: null,
    model: null,
    status: 'COMPLETED',
    errorMessage: null,
    generationTimeMs: null,
    durationMs: 9000,
    videoFormat: 'mp4',
    sourceFileName: 'edited-my-video.mp4',
    subtitlePath: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('renders a video player and metadata once execution has completed', async () => {
    const screen: RenderResult = await renderExecutor({
      executeWorkflow: createMutation({ data: EDITED_ASSET }),
    })

    await expect.element(screen.getByText('edited-my-video.mp4')).toBeInTheDocument()
    await expect.element(screen.getByText(/1080×1920 · 9\.0s · mp4/)).toBeInTheDocument()

    const video = document.querySelector('video')
    expect(video?.getAttribute('src')).toBe('/uploads/images/project-1/edited.mp4')
  })

  it('shows "None" for subtitles when the executed plan had no subtitles step', async () => {
    const screen: RenderResult = await renderExecutor({
      executeWorkflow: createMutation({ data: EDITED_ASSET }),
    })

    await expect.element(screen.getByText(/Subtitles:/)).toBeInTheDocument()
    await expect.element(screen.getByText('None')).toBeInTheDocument()
  })

  it('shows a subtitle preview link when the executed plan generated subtitles', async () => {
    const screen: RenderResult = await renderExecutor({
      executeWorkflow: createMutation({
        data: { ...EDITED_ASSET, subtitlePath: 'project-1/edited.srt' },
      }),
    })

    const link = screen.getByRole('link', { name: /preview \.srt/i })
    await expect.element(link).toBeInTheDocument()
    expect(link.element().getAttribute('href')).toBe('/uploads/images/project-1/edited.srt')
  })
})

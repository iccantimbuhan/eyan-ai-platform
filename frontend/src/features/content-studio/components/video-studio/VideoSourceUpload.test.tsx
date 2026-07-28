import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { useUploadVideoSource } from '../../hooks/use-upload-video-source'
import { VideoSourceUpload } from './VideoSourceUpload'

type UploadMutation = ReturnType<typeof useUploadVideoSource>

function createMutation(overrides: Partial<UploadMutation> = {}): UploadMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as UploadMutation
}

function renderUpload(overrides: { uploadVideoSource?: UploadMutation } = {}) {
  return render(
    <VideoSourceUpload
      projectId='project-1'
      uploadVideoSource={overrides.uploadVideoSource ?? createMutation()}
    />
  )
}

describe('VideoSourceUpload', () => {
  it('renders the upload prompt and a Choose file button', async () => {
    const screen = await renderUpload()

    await expect
      .element(screen.getByText(/Upload a source video/i))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /Choose file/i }))
      .toBeInTheDocument()
  })

  it('submits the selected file, project id, and a progress callback to the mutation', async () => {
    const mutate = vi.fn() as UploadMutation['mutate']
    await renderUpload({ uploadVideoSource: createMutation({ mutate }) })

    const file = new File(['fake-bytes'], 'my-video.mp4', { type: 'video/mp4' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        file,
        onUploadProgress: expect.any(Function),
      }),
      expect.objectContaining({ onSettled: expect.any(Function) })
    )
  })

  it('shows a pending state and progress bar while uploading', async () => {
    const screen = await renderUpload({
      uploadVideoSource: createMutation({ isPending: true }),
    })

    const pendingButton = screen.getByRole('button', { name: /Uploading/i })
    await expect.element(pendingButton).toBeInTheDocument()
    await expect.element(pendingButton).toBeDisabled()

    const progressBar = document.querySelector('[role="progressbar"]')
    expect(progressBar).not.toBeNull()
  })

  it('shows the server-provided error message', async () => {
    const axiosError = new AxiosError(
      'Request failed with status code 400',
      '400',
      undefined,
      undefined,
      {
        status: 400,
        statusText: 'Bad Request',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: {
          success: false,
          error: 'The uploaded file could not be read as a valid video.',
        },
      }
    )

    const screen = await renderUpload({
      uploadVideoSource: createMutation({ isError: true, error: axiosError }),
    })

    await expect
      .element(screen.getByText(/could not be read as a valid video/i))
      .toBeInTheDocument()
  })

  it('renders a video player and metadata once the upload has completed', async () => {
    const screen: RenderResult = await renderUpload({
      uploadVideoSource: createMutation({
        data: {
          id: 'video-1',
          projectId: 'project-1',
          brandKitId: null,
          videoGroupId: 'group-1',
          kind: 'UPLOADED_SOURCE',
          prompt: 'my-video.mp4',
          output: null,
          provider: 'upload',
          width: 640,
          height: 360,
          format: null,
          storagePath: 'project-1/uuid.mp4',
          thumbnailPath: null,
          model: null,
          status: 'COMPLETED',
          errorMessage: null,
          generationTimeMs: null,
          durationMs: 3000,
          videoFormat: 'mp4',
          sourceFileName: 'my-video.mp4',
          subtitlePath: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    })

    await expect.element(screen.getByText('my-video.mp4')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/640×360 · 3\.0s · mp4/))
      .toBeInTheDocument()

    const video = document.querySelector('video')
    expect(video?.getAttribute('src')).toBe('/uploads/images/project-1/uuid.mp4')
  })
})

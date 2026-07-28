import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import type { VideoAsset } from '../../types/video-asset'
import { VideoAssetList } from './VideoAssetList'

type VideoAssetsQueryState = {
  data: { items: VideoAsset[] } | undefined
  isLoading: boolean
  isError: boolean
}

let mockUseVideoAssets: () => VideoAssetsQueryState

vi.mock('../../hooks/use-video-assets', () => ({
  useVideoAssets: () => mockUseVideoAssets(),
}))

function setVideoAssetsState(overrides: Partial<VideoAssetsQueryState> = {}) {
  mockUseVideoAssets = () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
    ...overrides,
  })
}

const scriptAsset: VideoAsset = {
  id: 'video-1',
  projectId: 'project-1',
  brandKitId: null,
  videoGroupId: 'group-12345678',
  kind: 'SCRIPT',
  prompt: 'A rocket launch video',
  output: 'INT. LAUNCH PAD - DAY',
  provider: null,
  width: null,
  height: null,
  format: null,
  storagePath: null,
  thumbnailPath: null,
  model: 'qwen2.5',
  status: 'COMPLETED',
  errorMessage: null,
  generationTimeMs: 900,
  durationMs: null,
  videoFormat: null,
  sourceFileName: null,
  subtitlePath: null,
  createdAt: '2026-07-27T00:00:01.000Z',
  updatedAt: '2026-07-27T00:00:01.000Z',
}

const storyboardAsset: VideoAsset = {
  ...scriptAsset,
  id: 'video-2',
  kind: 'STORYBOARD',
  output: null,
  provider: 'huggingface',
  width: 512,
  height: 512,
  format: 'png',
  storagePath: 'project-1/frame.png',
  status: 'COMPLETED',
  updatedAt: '2026-07-27T00:00:02.000Z',
}

const uploadedSourceAsset: VideoAsset = {
  ...scriptAsset,
  id: 'video-4',
  kind: 'UPLOADED_SOURCE',
  prompt: 'my-video.mp4',
  output: null,
  provider: 'upload',
  width: 640,
  height: 360,
  storagePath: 'project-1/uuid.mp4',
  status: 'COMPLETED',
  durationMs: 12500,
  videoFormat: 'mp4',
  sourceFileName: 'my-video.mp4',
  updatedAt: '2026-07-27T00:00:04.000Z',
}

const failedAsset: VideoAsset = {
  ...scriptAsset,
  id: 'video-3',
  kind: 'THUMBNAIL',
  output: null,
  status: 'FAILED',
  errorMessage: 'Video asset generation failed. Please try again, or try a different provider.',
  updatedAt: '2026-07-27T00:00:03.000Z',
}

describe('VideoAssetList', () => {
  beforeEach(() => {
    setVideoAssetsState()
  })

  it('shows a loading status while the query is fetching', async () => {
    setVideoAssetsState({ isLoading: true, data: undefined })

    const screen = await render(<VideoAssetList projectId='project-1' />)

    await expect
      .element(screen.getByRole('status', { name: 'Loading video assets' }))
      .toBeInTheDocument()
  })

  it('shows an error message when the query fails', async () => {
    setVideoAssetsState({ isError: true, data: undefined })

    const screen = await render(<VideoAssetList projectId='project-1' />)

    await expect
      .element(screen.getByText(/Failed to load video assets/i))
      .toBeInTheDocument()
  })

  it('shows an empty-state placeholder when there are no video assets yet', async () => {
    const screen = await render(<VideoAssetList projectId='project-1' />)

    await expect
      .element(screen.getByText(/Generated video artifacts will appear here/i))
      .toBeInTheDocument()
  })

  it('groups artifacts by videoGroupId under one card', async () => {
    setVideoAssetsState({ data: { items: [scriptAsset, storyboardAsset] } })

    const screen = await render(<VideoAssetList projectId='project-1' />)

    await expect
      .element(screen.getByText('Video group-12'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Script')).toBeInTheDocument()
    await expect.element(screen.getByText('Storyboard')).toBeInTheDocument()
  })

  it('renders a text artifact\'s output', async () => {
    setVideoAssetsState({ data: { items: [scriptAsset] } })

    const screen = await render(<VideoAssetList projectId='project-1' />)

    await expect
      .element(screen.getByText(/INT\. LAUNCH PAD - DAY/i))
      .toBeInTheDocument()
  })

  it('renders an image artifact as an image', async () => {
    setVideoAssetsState({ data: { items: [storyboardAsset] } })

    const screen = await render(<VideoAssetList projectId='project-1' />)

    const image = screen.getByRole('img', { name: /A rocket launch video/i })
    await expect.element(image).toBeInTheDocument()
    await expect
      .element(image)
      .toHaveAttribute('src', '/uploads/images/project-1/frame.png')
  })

  it('renders an uploaded source as a video player with its real metadata', async () => {
    setVideoAssetsState({ data: { items: [uploadedSourceAsset] } })

    const screen = await render(<VideoAssetList projectId='project-1' />)

    await expect.element(screen.getByText('Uploaded Source')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/640×360 · 12\.5s · mp4/))
      .toBeInTheDocument()

    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toBe('/uploads/images/project-1/uuid.mp4')
  })

  it('shows a Failed badge and the error message for a failed artifact', async () => {
    setVideoAssetsState({ data: { items: [failedAsset] } })

    const screen = await render(<VideoAssetList projectId='project-1' />)

    await expect
      .element(screen.getByText('Failed', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(/Video asset generation failed/i))
      .toBeInTheDocument()
  })
})

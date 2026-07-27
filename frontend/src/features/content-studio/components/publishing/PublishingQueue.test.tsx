import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { AssetSummary } from '../../types/asset'
import { PublishingQueue } from './PublishingQueue'

vi.mock('../assets/AssetDetailSheet', () => ({
  AssetDetailSheet: ({ asset }: { asset: AssetSummary | null }) =>
    asset ? <div>Viewing: {asset.title}</div> : null,
}))

const useAssetsSpy = vi.fn()
let mockUseAssetsReturn: {
  data:
    | {
        items: AssetSummary[]
        pagination: { page: number; pageSize: number; total: number; totalPages: number }
      }
    | undefined
  isLoading: boolean
  isError: boolean
}

vi.mock('../../hooks/use-assets', () => ({
  useAssets: (...args: unknown[]) => {
    useAssetsSpy(...args)
    return mockUseAssetsReturn
  },
}))

const asset1: AssetSummary = {
  id: 'content-1',
  assetType: 'BLOG',
  title: 'First Asset',
  promptPreview: 'preview text',
  status: 'APPROVED',
  provider: 'ollama',
  model: 'qwen2.5',
  version: 1,
  projectId: 'project-1',
  projectName: 'My Project',
  thumbnailUrl: null,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  commentCount: 0,
  openCommentCount: 0,
  assignee: null,
  publishing: [{ platform: 'fake', status: 'SCHEDULED' }],
}

function setAssetsState(overrides: Partial<typeof mockUseAssetsReturn> = {}) {
  mockUseAssetsReturn = {
    data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
    isLoading: false,
    isError: false,
    ...overrides,
  }
}

describe('PublishingQueue', () => {
  beforeEach(() => {
    useAssetsSpy.mockClear()
    setAssetsState()
  })

  it('defaults to the Scheduled filter', async () => {
    await render(<PublishingQueue projectId='project-1' />)

    expect(useAssetsSpy).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ publishingStatus: 'SCHEDULED' })
    )
  })

  it('switches the publishing status filter when a different tab is selected', async () => {
    const screen = await render(<PublishingQueue projectId='project-1' />)

    await userEvent.click(screen.getByRole('tab', { name: 'Published' }))

    expect(useAssetsSpy).toHaveBeenLastCalledWith(
      'project-1',
      expect.objectContaining({ publishingStatus: 'PUBLISHED' })
    )
  })

  it('shows an empty state when the queue is empty for the current status', async () => {
    const screen = await render(<PublishingQueue projectId='project-1' />)

    await expect
      .element(screen.getByText(/queue is empty for this status/i))
      .toBeInTheDocument()
  })

  it('renders each item with its platform badge', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    })

    const screen = await render(<PublishingQueue projectId='project-1' />)

    await expect.element(screen.getByText('First Asset')).toBeInTheDocument()
    await expect.element(screen.getByText('fake')).toBeInTheDocument()
  })

  it('opens the detail sheet when Open is clicked', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    })

    const screen = await render(<PublishingQueue projectId='project-1' />)

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))

    await expect.element(screen.getByText('Viewing: First Asset')).toBeInTheDocument()
  })
})

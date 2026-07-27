import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { AssetSummary } from '../../types/asset'
import { ReviewQueue } from './ReviewQueue'

vi.mock('./AssetDetailSheet', () => ({
  AssetDetailSheet: ({ asset }: { asset: AssetSummary | null }) =>
    asset ? <div>Viewing: {asset.title}</div> : null,
}))

const useAssetsSpy = vi.fn()
let mockUseAssetsReturn: {
  data: { items: AssetSummary[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } } | undefined
  isLoading: boolean
  isError: boolean
}

vi.mock('../../hooks/use-assets', () => ({
  useAssets: (...args: unknown[]) => {
    useAssetsSpy(...args)
    return mockUseAssetsReturn
  },
}))

const reviewMutate = vi.fn()
vi.mock('../../hooks/use-review-asset', () => ({
  useReviewAsset: () => ({ mutate: reviewMutate, isPending: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const asset1: AssetSummary = {
  id: 'content-1',
  assetType: 'BLOG',
  title: 'First Asset',
  promptPreview: 'preview text',
  status: 'NEEDS_REVIEW',
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
  publishing: [],
}

function setAssetsState(overrides: Partial<typeof mockUseAssetsReturn> = {}) {
  mockUseAssetsReturn = {
    data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
    isLoading: false,
    isError: false,
    ...overrides,
  }
}

describe('ReviewQueue', () => {
  beforeEach(() => {
    useAssetsSpy.mockClear()
    reviewMutate.mockReset()
    setAssetsState()
  })

  it('defaults to the Needs Review filter', async () => {
    await render(<ReviewQueue projectId='project-1' />)

    expect(useAssetsSpy).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ status: 'NEEDS_REVIEW' })
    )
  })

  it('switches the status filter when a different tab is selected', async () => {
    const screen = await render(<ReviewQueue projectId='project-1' />)

    await userEvent.click(screen.getByRole('tab', { name: 'Approved' }))

    expect(useAssetsSpy).toHaveBeenLastCalledWith(
      'project-1',
      expect.objectContaining({ status: 'APPROVED' })
    )
  })

  it('shows an empty state when the queue is empty for the current status', async () => {
    const screen = await render(<ReviewQueue projectId='project-1' />)

    await expect
      .element(screen.getByText(/queue is empty for this status/i))
      .toBeInTheDocument()
  })

  it('renders each item with Approve, Reject, and Add Notes actions', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    })

    const screen = await render(<ReviewQueue projectId='project-1' />)

    await expect.element(screen.getByText('First Asset')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Add Notes' })).toBeInTheDocument()
  })

  it('calls the review mutation with APPROVED when Approve is clicked', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    })

    const screen = await render(<ReviewQueue projectId='project-1' />)

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(reviewMutate).toHaveBeenCalledWith(
      {
        assetType: 'BLOG',
        sourceId: 'content-1',
        payload: { status: 'APPROVED' },
      },
      expect.anything()
    )
  })

  it('saves notes through the Add Notes dialog', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    })

    const screen = await render(<ReviewQueue projectId='project-1' />)

    await userEvent.click(screen.getByRole('button', { name: 'Add Notes' }))
    await userEvent.fill(screen.getByPlaceholder('Reviewer notes...'), 'Looks great')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(reviewMutate).toHaveBeenCalledWith(
      {
        assetType: 'BLOG',
        sourceId: 'content-1',
        payload: { notes: 'Looks great' },
      },
      expect.anything()
    )
  })

  it('opens the detail sheet when Open is clicked', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    })

    const screen = await render(<ReviewQueue projectId='project-1' />)

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))

    await expect.element(screen.getByText('Viewing: First Asset')).toBeInTheDocument()
  })
})

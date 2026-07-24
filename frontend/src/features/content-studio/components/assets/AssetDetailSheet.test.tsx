import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { AssetDetail, AssetSummary } from '../../types/asset'
import { AssetDetailSheet } from './AssetDetailSheet'

// VersionHistory has its own dependencies (useAssetVersions,
// VersionCompareDialog) and its own test coverage — stubbed here so this
// file only exercises AssetDetailSheet's own sections and actions.
vi.mock('./VersionHistory', () => ({
  VersionHistory: () => <div>Version History Stub</div>,
}))

let mockUseAssetReturn: {
  data: AssetDetail | undefined
  isLoading: boolean
  isError: boolean
}

vi.mock('../../hooks/use-asset', () => ({
  useAsset: () => mockUseAssetReturn,
}))

const reviewMutate = vi.fn()
const duplicateMutate = vi.fn()
const regenerateMutate = vi.fn()
const deleteMutate = vi.fn()

vi.mock('../../hooks/use-review-asset', () => ({
  useReviewAsset: () => ({ mutate: reviewMutate, isPending: false }),
}))
vi.mock('../../hooks/use-duplicate-asset', () => ({
  useDuplicateAsset: () => ({ mutate: duplicateMutate, isPending: false }),
}))
vi.mock('../../hooks/use-regenerate-asset', () => ({
  useRegenerateAsset: () => ({ mutate: regenerateMutate, isPending: false }),
}))
vi.mock('../../hooks/use-delete-asset', () => ({
  useDeleteAsset: () => ({ mutate: deleteMutate, isPending: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const baseAsset: AssetDetail = {
  id: 'image-1',
  assetType: 'IMAGE',
  title: 'A lighthouse at sunset',
  promptPreview: 'A lighthouse at sunset',
  status: 'NEEDS_REVIEW',
  provider: 'fake',
  model: 'fake-image-v1',
  version: 2,
  projectId: 'project-1',
  projectName: 'My Project',
  thumbnailUrl: 'project-1/abc.png',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  prompt: 'A lighthouse at sunset',
  negativePrompt: 'blurry',
  output: null,
  generationTimeMs: 4200,
  reviewerId: null,
  reviewerName: null,
  reviewedAt: null,
  notes: null,
  qaScore: null,
  checklist: null,
}

const summary: AssetSummary = baseAsset

function setAssetState(overrides: Partial<typeof mockUseAssetReturn> = {}) {
  mockUseAssetReturn = {
    data: baseAsset,
    isLoading: false,
    isError: false,
    ...overrides,
  }
}

describe('AssetDetailSheet', () => {
  beforeEach(() => {
    reviewMutate.mockReset()
    duplicateMutate.mockReset()
    regenerateMutate.mockReset()
    deleteMutate.mockReset()
    setAssetState()
  })

  it('renders nothing when no asset is selected', async () => {
    const screen = await render(
      <AssetDetailSheet asset={null} projectId='project-1' onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByText(baseAsset.title)).not.toBeInTheDocument()
  })

  it('shows a loading state while fetching', async () => {
    setAssetState({ isLoading: true, data: undefined })

    const screen = await render(
      <AssetDetailSheet asset={summary} projectId='project-1' onOpenChange={vi.fn()} />
    )

    await expect
      .element(screen.getByRole('status', { name: 'Loading asset' }))
      .toBeInTheDocument()
  })

  it('shows General, Metadata, QA, and Actions sections once loaded', async () => {
    const screen = await render(
      <AssetDetailSheet asset={summary} projectId='project-1' onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByText('General')).toBeInTheDocument()
    await expect.element(screen.getByText('Metadata')).toBeInTheDocument()
    await expect.element(screen.getByText('Quality Assurance')).toBeInTheDocument()
    await expect.element(screen.getByText('Actions')).toBeInTheDocument()
    await expect.element(screen.getByText('blurry')).toBeInTheDocument()
    await expect.element(screen.getByText('4.2s')).toBeInTheDocument()
  })

  it('saves a review with the selected status', async () => {
    const screen = await render(
      <AssetDetailSheet asset={summary} projectId='project-1' onOpenChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save Review' }))

    expect(reviewMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        assetType: 'IMAGE',
        sourceId: 'image-1',
        payload: expect.objectContaining({ status: 'NEEDS_REVIEW' }),
      }),
      expect.anything()
    )
  })

  it('calls the regenerate mutation from the Actions row', async () => {
    const screen = await render(
      <AssetDetailSheet asset={summary} projectId='project-1' onOpenChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }))

    expect(regenerateMutate).toHaveBeenCalledWith(
      { assetType: 'IMAGE', sourceId: 'image-1' },
      expect.anything()
    )
  })

  it('hides Regenerate for a PROMPT_TEMPLATE asset', async () => {
    setAssetState({ data: { ...baseAsset, assetType: 'PROMPT_TEMPLATE' } })

    const screen = await render(
      <AssetDetailSheet
        asset={{ ...summary, assetType: 'PROMPT_TEMPLATE' }}
        projectId='project-1'
        onOpenChange={vi.fn()}
      />
    )

    await expect
      .element(screen.getByRole('button', { name: 'Regenerate' }))
      .not.toBeInTheDocument()
  })

  it('asks for confirmation before deleting', async () => {
    const screen = await render(
      <AssetDetailSheet asset={summary} projectId='project-1' onOpenChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await expect
      .element(screen.getByRole('heading', { name: 'Delete this asset?' }))
      .toBeInTheDocument()
    expect(deleteMutate).not.toHaveBeenCalled()
  })
})

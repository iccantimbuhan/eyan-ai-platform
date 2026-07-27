import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { AssetSummary } from '../../types/asset'
import { AssetLibrary } from './AssetLibrary'

// AssetCard, AssetDetailSheet, and NewPromptTemplateDialog each have their
// own dedicated test files and their own hook dependencies — stubbed here
// so this file only exercises AssetLibrary's own orchestration (search,
// filters, pagination, selection, batch actions), matching this codebase's
// general "isolate the unit under test" convention for composed components.
vi.mock('./AssetCard', () => ({
  AssetCard: ({
    asset,
    selected,
    onSelectChange,
    onView,
  }: {
    asset: AssetSummary
    selected?: boolean
    onSelectChange?: (checked: boolean) => void
    onView: (asset: AssetSummary) => void
  }) => (
    <div>
      <button onClick={() => onView(asset)}>{asset.title}</button>
      {onSelectChange && (
        <input
          type='checkbox'
          checked={selected}
          onChange={(e) => onSelectChange(e.target.checked)}
          aria-label={`Select ${asset.title}`}
        />
      )}
    </div>
  ),
}))

vi.mock('./AssetDetailSheet', () => ({
  AssetDetailSheet: ({ asset }: { asset: AssetSummary | null }) =>
    asset ? <div>Viewing: {asset.title}</div> : null,
}))

vi.mock('./NewPromptTemplateDialog', () => ({
  NewPromptTemplateDialog: ({ open }: { open: boolean }) =>
    open ? <div>New Prompt Template Dialog</div> : null,
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

const batchMutate = vi.fn()
vi.mock('../../hooks/use-batch-asset-action', () => ({
  useBatchAssetAction: () => ({ mutate: batchMutate, isPending: false }),
}))

vi.mock('../../api/assets.api', () => ({
  assetsApi: { getAsset: vi.fn() },
}))

vi.mock('../../lib/asset-export', () => ({
  downloadAsset: vi.fn(),
  exportAssetsAsJson: vi.fn(() => '[]'),
  downloadBlob: vi.fn(),
}))

const asset1: AssetSummary = {
  id: 'content-1',
  assetType: 'BLOG',
  title: 'First Asset',
  promptPreview: 'preview',
  status: 'DRAFT',
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

const asset2: AssetSummary = {
  ...asset1,
  id: 'image-1',
  assetType: 'IMAGE',
  title: 'Second Asset',
}

function setAssetsState(overrides: Partial<typeof mockUseAssetsReturn> = {}) {
  mockUseAssetsReturn = {
    data: { items: [], pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 } },
    isLoading: false,
    isError: false,
    ...overrides,
  }
}

describe('AssetLibrary', () => {
  beforeEach(() => {
    useAssetsSpy.mockClear()
    batchMutate.mockReset()
    setAssetsState()
  })

  it('shows a loading state while fetching', async () => {
    setAssetsState({ isLoading: true, data: undefined })

    const screen = await render(<AssetLibrary projectId='project-1' />)

    await expect
      .element(screen.getByRole('status', { name: 'Loading assets' }))
      .toBeInTheDocument()
  })

  it('shows an error message on failure', async () => {
    setAssetsState({ isError: true, data: undefined })

    const screen = await render(<AssetLibrary projectId='project-1' />)

    await expect
      .element(screen.getByText(/Failed to load assets/i))
      .toBeInTheDocument()
  })

  it('shows an empty state when there are no assets yet', async () => {
    const screen = await render(<AssetLibrary projectId='project-1' />)

    await expect.element(screen.getByText(/No assets yet/i)).toBeInTheDocument()
  })

  it('renders a card per asset', async () => {
    setAssetsState({
      data: { items: [asset1, asset2], pagination: { page: 1, pageSize: 12, total: 2, totalPages: 1 } },
    })

    const screen = await render(<AssetLibrary projectId='project-1' />)

    await expect.element(screen.getByText('First Asset')).toBeInTheDocument()
    await expect.element(screen.getByText('Second Asset')).toBeInTheDocument()
  })

  it('opens the New Prompt Template dialog', async () => {
    const screen = await render(<AssetLibrary projectId='project-1' />)

    await userEvent.click(screen.getByRole('button', { name: /New Prompt Template/i }))

    await expect
      .element(screen.getByText('New Prompt Template Dialog'))
      .toBeInTheDocument()
  })

  it('shows the bulk actions bar once an asset is selected, and clears it on demand', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 } },
    })

    const screen = await render(<AssetLibrary projectId='project-1' />)

    await expect
      .element(screen.getByRole('toolbar', { name: /Bulk actions/i }))
      .not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select First Asset' }))

    await expect
      .element(screen.getByRole('toolbar', { name: /1 selected asset/i }))
      .toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

    await expect
      .element(screen.getByRole('toolbar', { name: /Bulk actions/i }))
      .not.toBeInTheDocument()
  })

  it('calls the batch mutation with the selected item and "approve" when Approve is clicked', async () => {
    batchMutate.mockImplementation((_vars, options) => {
      options?.onSuccess?.([{ sourceId: 'content-1', assetType: 'BLOG', success: true }])
    })
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 } },
    })

    const screen = await render(<AssetLibrary projectId='project-1' />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select First Asset' }))
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(batchMutate).toHaveBeenCalledWith(
      { items: [{ assetType: 'BLOG', sourceId: 'content-1' }], action: 'approve' },
      expect.anything()
    )
  })

  it('opens the detail sheet when a card is viewed', async () => {
    setAssetsState({
      data: { items: [asset1], pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 } },
    })

    const screen = await render(<AssetLibrary projectId='project-1' />)

    await userEvent.click(screen.getByRole('button', { name: 'First Asset' }))

    await expect.element(screen.getByText('Viewing: First Asset')).toBeInTheDocument()
  })
})

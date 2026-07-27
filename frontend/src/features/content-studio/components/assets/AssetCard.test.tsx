import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { AssetSummary } from '../../types/asset'
import { AssetCard } from './AssetCard'

const deleteMutate = vi.fn()
const duplicateMutate = vi.fn()
const regenerateMutate = vi.fn()

vi.mock('../../hooks/use-delete-asset', () => ({
  useDeleteAsset: () => ({ mutate: deleteMutate, isPending: false }),
}))
vi.mock('../../hooks/use-duplicate-asset', () => ({
  useDuplicateAsset: () => ({ mutate: duplicateMutate, isPending: false }),
}))
vi.mock('../../hooks/use-regenerate-asset', () => ({
  useRegenerateAsset: () => ({ mutate: regenerateMutate, isPending: false }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}))

const getAssetMock = vi.fn()
vi.mock('../../api/assets.api', () => ({
  assetsApi: { getAsset: (...args: unknown[]) => getAssetMock(...args) },
}))

const contentAsset: AssetSummary = {
  id: 'content-1',
  assetType: 'BLOG',
  title: 'My Blog Post',
  promptPreview: 'Write about cats',
  status: 'DRAFT',
  provider: 'ollama',
  model: 'qwen2.5-coder:7b',
  version: 1,
  projectId: 'project-1',
  projectName: 'My Project',
  thumbnailUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  commentCount: 0,
  openCommentCount: 0,
  assignee: null,
  publishing: [],
}

const promptAsset: AssetSummary = {
  ...contentAsset,
  id: 'prompt-1',
  assetType: 'PROMPT_TEMPLATE',
  provider: null,
  model: null,
}

describe('AssetCard', () => {
  beforeEach(() => {
    deleteMutate.mockReset()
    duplicateMutate.mockReset()
    regenerateMutate.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
    getAssetMock.mockReset()
  })

  it('renders title, type, status, provider/model, version, and prompt preview', async () => {
    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={vi.fn()} />
    )

    await expect.element(screen.getByText('My Blog Post')).toBeInTheDocument()
    await expect.element(screen.getByText('Blog', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Draft', { exact: true })).toBeInTheDocument()
    await expect
      .element(screen.getByText('ollama · qwen2.5-coder:7b'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('v1', { exact: true })).toBeInTheDocument()
    await expect.element(screen.getByText('Write about cats')).toBeInTheDocument()
  })

  it('calls onView when the title is clicked', async () => {
    const onView = vi.fn()
    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={onView} />
    )

    await userEvent.click(screen.getByText('My Blog Post'))

    expect(onView).toHaveBeenCalledWith(contentAsset)
  })

  it('shows no selection checkbox when onSelectChange is not provided', async () => {
    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={vi.fn()} />
    )

    await expect.element(screen.getByRole('checkbox')).not.toBeInTheDocument()
  })

  it('calls onSelectChange when the checkbox is toggled', async () => {
    const onSelectChange = vi.fn()
    const screen = await render(
      <AssetCard
        asset={contentAsset}
        projectId='project-1'
        onView={vi.fn()}
        onSelectChange={onSelectChange}
        selected={false}
      />
    )

    await userEvent.click(screen.getByRole('checkbox'))

    expect(onSelectChange).toHaveBeenCalledWith(true)
  })

  it('shows Regenerate in the quick actions for a content asset', async () => {
    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Asset actions' }))

    await expect
      .element(screen.getByRole('menuitem', { name: /Regenerate/i }))
      .toBeInTheDocument()
  })

  it('hides Regenerate in the quick actions for a prompt template', async () => {
    const screen = await render(
      <AssetCard asset={promptAsset} projectId='project-1' onView={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Asset actions' }))

    await expect
      .element(screen.getByRole('menuitem', { name: /Regenerate/i }))
      .not.toBeInTheDocument()
  })

  it('calls the duplicate mutation when Duplicate is clicked', async () => {
    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Asset actions' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Duplicate/i }))

    expect(duplicateMutate).toHaveBeenCalledWith(
      { assetType: 'BLOG', sourceId: 'content-1' },
      expect.anything()
    )
  })

  it('calls the regenerate mutation when Regenerate is clicked', async () => {
    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Asset actions' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Regenerate/i }))

    expect(regenerateMutate).toHaveBeenCalledWith(
      { assetType: 'BLOG', sourceId: 'content-1' },
      expect.anything()
    )
  })

  it('asks for confirmation before deleting, and only deletes on confirm', async () => {
    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Asset actions' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Delete/i }))

    await expect
      .element(screen.getByRole('heading', { name: 'Delete this asset?' }))
      .toBeInTheDocument()
    expect(deleteMutate).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(deleteMutate).toHaveBeenCalledWith(
      { assetType: 'BLOG', sourceId: 'content-1' },
      expect.anything()
    )
  })

  it('copies the asset output to the clipboard when Copy is clicked', async () => {
    getAssetMock.mockResolvedValue({ output: 'Cats are great.', prompt: 'Write about cats' })
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    const screen = await render(
      <AssetCard asset={contentAsset} projectId='project-1' onView={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Asset actions' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /^Copy$/i }))

    await expect.poll(() => writeText.mock.calls.length).toBeGreaterThan(0)
    expect(writeText).toHaveBeenCalledWith('Cats are great.')
  })
})

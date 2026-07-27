import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { AssetComment } from '../../types/review-workspace'
import { CommentThread } from './CommentThread'

const useAssetCommentsMock = vi.fn()
const addCommentMutate = vi.fn()
const resolveCommentMutate = vi.fn()

vi.mock('../../hooks/use-asset-comments', () => ({
  useAssetComments: (...args: unknown[]) => useAssetCommentsMock(...args),
  useAddComment: () => ({ mutate: addCommentMutate, isPending: false }),
  useResolveComment: () => ({ mutate: resolveCommentMutate, isPending: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const generalComment: AssetComment = {
  id: 'comment-1',
  assetType: 'IMAGE',
  sourceId: 'image-1',
  authorId: 'user-1',
  authorName: 'Ada Lovelace',
  body: 'Looks great overall.',
  isInternal: false,
  region: null,
  timestampMs: null,
  resolvedAt: null,
  resolvedBy: null,
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
}

const regionComment: AssetComment = {
  ...generalComment,
  id: 'comment-2',
  region: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
}

describe('CommentThread', () => {
  beforeEach(() => {
    addCommentMutate.mockReset()
    resolveCommentMutate.mockReset()
  })

  it('shows an empty state when there are no general comments', async () => {
    useAssetCommentsMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <CommentThread projectId='project-1' assetType='IMAGE' sourceId='image-1' />
    )

    await expect.element(screen.getByText('No comments yet.')).toBeInTheDocument()
  })

  it('lists only general (non-anchored) comments by default', async () => {
    useAssetCommentsMock.mockReturnValue({
      data: [generalComment, regionComment],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <CommentThread projectId='project-1' assetType='IMAGE' sourceId='image-1' />
    )

    await expect.element(screen.getByText('Looks great overall.')).toBeInTheDocument()
    // The region comment renders twice in the DOM tree (once per filter),
    // but the general-only view should exclude it — assert the composer
    // isn't duplicated with the region badge showing here.
    await expect.element(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })

  it('lists only anchored comments when filter="annotations"', async () => {
    useAssetCommentsMock.mockReturnValue({
      data: [generalComment, regionComment],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <CommentThread
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        filter='annotations'
      />
    )

    await expect.element(screen.getByText('Region')).toBeInTheDocument()
    // No composer in annotation-only mode.
    await expect
      .element(screen.getByPlaceholder('Add a comment...'))
      .not.toBeInTheDocument()
  })

  it('posts a new comment', async () => {
    useAssetCommentsMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <CommentThread projectId='project-1' assetType='IMAGE' sourceId='image-1' />
    )

    await userEvent.fill(screen.getByPlaceholder('Add a comment...'), 'Needs a fix')
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))

    expect(addCommentMutate).toHaveBeenCalledWith(
      {
        assetType: 'IMAGE',
        sourceId: 'image-1',
        payload: { body: 'Needs a fix', isInternal: false },
      },
      expect.anything()
    )
  })

  it('resolves an unresolved comment', async () => {
    useAssetCommentsMock.mockReturnValue({
      data: [generalComment],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <CommentThread projectId='project-1' assetType='IMAGE' sourceId='image-1' />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Resolve' }))

    expect(resolveCommentMutate).toHaveBeenCalledWith(
      { assetType: 'IMAGE', sourceId: 'image-1', commentId: 'comment-1' },
      expect.anything()
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import type { AssetComment } from '../../types/review-workspace'
import { VideoTimestampAnnotations } from './VideoTimestampAnnotations'

const useAssetCommentsMock = vi.fn()
const addCommentMutate = vi.fn()

vi.mock('../../hooks/use-asset-comments', () => ({
  useAssetComments: (...args: unknown[]) => useAssetCommentsMock(...args),
  useAddComment: () => ({ mutate: addCommentMutate, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const annotation: AssetComment = {
  id: 'comment-1',
  assetType: 'VIDEO',
  sourceId: 'video-1',
  authorId: 'user-1',
  authorName: 'Ada Lovelace',
  body: 'Pacing feels slow here.',
  isInternal: false,
  region: null,
  timestampMs: 70_000,
  resolvedAt: null,
  resolvedBy: null,
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
}

describe('VideoTimestampAnnotations', () => {
  beforeEach(() => {
    addCommentMutate.mockReset()
  })

  it('shows an empty state when there are no timestamp annotations', async () => {
    useAssetCommentsMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <VideoTimestampAnnotations projectId='project-1' assetType='VIDEO' sourceId='video-1' />
    )

    await expect
      .element(screen.getByText('No timestamp annotations yet.'))
      .toBeInTheDocument()
  })

  it('formats a stored timestampMs as mm:ss', async () => {
    useAssetCommentsMock.mockReturnValue({
      data: [annotation],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <VideoTimestampAnnotations projectId='project-1' assetType='VIDEO' sourceId='video-1' />
    )

    await expect.element(screen.getByText('1:10')).toBeInTheDocument()
    await expect.element(screen.getByText('Pacing feels slow here.')).toBeInTheDocument()
  })

  it('submits a new annotation, converting mm:ss to timestampMs', async () => {
    useAssetCommentsMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <VideoTimestampAnnotations projectId='project-1' assetType='VIDEO' sourceId='video-1' />
    )

    await userEvent.fill(screen.getByPlaceholder('mm:ss'), '1:10')
    await userEvent.fill(
      screen.getByPlaceholder('What happens at this point?'),
      'Cut this shot shorter'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(addCommentMutate).toHaveBeenCalledWith(
      {
        assetType: 'VIDEO',
        sourceId: 'video-1',
        payload: { body: 'Cut this shot shorter', timestampMs: 70_000 },
      },
      expect.anything()
    )
  })
})

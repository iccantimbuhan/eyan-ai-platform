import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import { RequestRevisionDialog } from './RequestRevisionDialog'

const addCommentMutate = vi.fn()
const reviewMutate = vi.fn()

vi.mock('../../hooks/use-asset-comments', () => ({
  useAddComment: () => ({ mutate: addCommentMutate, isPending: false }),
}))
vi.mock('../../hooks/use-review-asset', () => ({
  useReviewAsset: () => ({ mutate: reviewMutate, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('RequestRevisionDialog', () => {
  beforeEach(() => {
    addCommentMutate.mockReset()
    reviewMutate.mockReset()
  })

  it('disables submit until a reason is entered', async () => {
    const screen = await render(
      <RequestRevisionDialog
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        open
        onOpenChange={vi.fn()}
      />
    )

    await expect
      .element(screen.getByRole('button', { name: 'Request Revision' }))
      .toBeDisabled()
  })

  it('adds a comment with the reason, then sets status to REVISION_REQUESTED', async () => {
    addCommentMutate.mockImplementation((_vars, { onSuccess }) => onSuccess())

    const screen = await render(
      <RequestRevisionDialog
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        open
        onOpenChange={vi.fn()}
      />
    )

    await userEvent.fill(
      screen.getByPlaceholder('What needs to change?'),
      'Please fix the lighting'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Request Revision' }))

    expect(addCommentMutate).toHaveBeenCalledWith(
      {
        assetType: 'IMAGE',
        sourceId: 'image-1',
        payload: { body: 'Please fix the lighting' },
      },
      expect.anything()
    )
    expect(reviewMutate).toHaveBeenCalledWith(
      {
        assetType: 'IMAGE',
        sourceId: 'image-1',
        payload: { status: 'REVISION_REQUESTED' },
      },
      expect.anything()
    )
  })

  it('closes without submitting on Cancel', async () => {
    const onOpenChange = vi.fn()

    const screen = await render(
      <RequestRevisionDialog
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        open
        onOpenChange={onOpenChange}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(addCommentMutate).not.toHaveBeenCalled()
  })
})

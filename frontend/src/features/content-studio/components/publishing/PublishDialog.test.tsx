import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import { PublishDialog } from './PublishDialog'

const scheduleMutate = vi.fn()
const publishMutate = vi.fn()

vi.mock('../../hooks/use-asset-publishing', () => ({
  useSchedulePublish: () => ({ mutate: scheduleMutate, isPending: false }),
  usePublishAsset: () => ({ mutate: publishMutate, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('PublishDialog', () => {
  beforeEach(() => {
    scheduleMutate.mockReset()
    publishMutate.mockReset()
  })

  it('disables the submit button when the asset is not approved', async () => {
    const screen = await render(
      <PublishDialog
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        status='NEEDS_REVIEW'
        open
        onOpenChange={vi.fn()}
      />
    )

    await expect
      .element(screen.getByRole('button', { name: 'Publish Now' }))
      .toBeDisabled()
  })

  it('schedules publishing to the "fake" platform when no date is chosen, then publishes immediately', async () => {
    scheduleMutate.mockImplementation((_vars, { onSuccess }) => onSuccess())

    const screen = await render(
      <PublishDialog
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        status='APPROVED'
        open
        onOpenChange={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Publish Now' }))

    expect(scheduleMutate).toHaveBeenCalledWith(
      {
        assetType: 'IMAGE',
        sourceId: 'image-1',
        payload: { platform: 'fake' },
      },
      expect.anything()
    )
    expect(publishMutate).toHaveBeenCalledWith(
      { assetType: 'IMAGE', sourceId: 'image-1', platform: 'fake' },
      expect.anything()
    )
  })

  it('closes without submitting on Cancel', async () => {
    const onOpenChange = vi.fn()

    const screen = await render(
      <PublishDialog
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        status='APPROVED'
        open
        onOpenChange={onOpenChange}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(scheduleMutate).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import { PublishingStatusPanel } from './PublishingStatusPanel'

const useAssetPublishingMock = vi.fn()
const scheduleMutate = vi.fn()
const publishMutate = vi.fn()
const retryMutate = vi.fn()
const archiveMutate = vi.fn()

vi.mock('../../hooks/use-asset-publishing', () => ({
  useAssetPublishing: (...args: unknown[]) => useAssetPublishingMock(...args),
  useSchedulePublish: () => ({ mutate: scheduleMutate, isPending: false }),
  usePublishAsset: () => ({ mutate: publishMutate, isPending: false }),
  useRetryPublish: () => ({ mutate: retryMutate, isPending: false }),
  useArchivePublish: () => ({ mutate: archiveMutate, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('PublishingStatusPanel', () => {
  beforeEach(() => {
    useAssetPublishingMock.mockReset()
    scheduleMutate.mockReset()
    publishMutate.mockReset()
    retryMutate.mockReset()
    archiveMutate.mockReset()
  })

  it('shows an empty state when there are no publishing records', async () => {
    useAssetPublishingMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <PublishingStatusPanel
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        status='APPROVED'
      />
    )

    await expect
      .element(screen.getByText('Not published to any platform yet.'))
      .toBeInTheDocument()
  })

  it('disables Schedule / Publish when the asset is not approved', async () => {
    useAssetPublishingMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <PublishingStatusPanel
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        status='NEEDS_REVIEW'
      />
    )

    await expect
      .element(screen.getByRole('button', { name: 'Schedule / Publish' }))
      .toBeDisabled()
  })

  it('retries a FAILED record', async () => {
    useAssetPublishingMock.mockReturnValue({
      data: [
        {
          id: 'pub-1',
          assetType: 'IMAGE',
          sourceId: 'image-1',
          platform: 'fake',
          status: 'FAILED',
          scheduledFor: null,
          publishedAt: null,
          externalId: null,
          externalUrl: null,
          errorMessage: 'platform rejected the post',
          attempts: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <PublishingStatusPanel
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        status='APPROVED'
      />
    )

    await expect.element(screen.getByText('platform rejected the post')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(retryMutate).toHaveBeenCalledWith(
      { assetType: 'IMAGE', sourceId: 'image-1', platform: 'fake' },
      expect.anything()
    )
  })

  it('publishes a SCHEDULED record immediately via Publish Now', async () => {
    useAssetPublishingMock.mockReturnValue({
      data: [
        {
          id: 'pub-1',
          assetType: 'IMAGE',
          sourceId: 'image-1',
          platform: 'fake',
          status: 'SCHEDULED',
          scheduledFor: '2026-08-01T00:00:00.000Z',
          publishedAt: null,
          externalId: null,
          externalUrl: null,
          errorMessage: null,
          attempts: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <PublishingStatusPanel
        projectId='project-1'
        assetType='IMAGE'
        sourceId='image-1'
        status='APPROVED'
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Publish Now' }))

    expect(publishMutate).toHaveBeenCalledWith(
      { assetType: 'IMAGE', sourceId: 'image-1', platform: 'fake' },
      expect.anything()
    )
  })
})

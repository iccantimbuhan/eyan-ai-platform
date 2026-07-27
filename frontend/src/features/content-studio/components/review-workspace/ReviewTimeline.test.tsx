import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import type { AssetReviewEvent } from '../../types/review-workspace'
import { ReviewTimeline } from './ReviewTimeline'

const useAssetTimelineMock = vi.fn()

vi.mock('../../hooks/use-asset-timeline', () => ({
  useAssetTimeline: (...args: unknown[]) => useAssetTimelineMock(...args),
}))

const statusEvent: AssetReviewEvent = {
  id: 'event-1',
  type: 'STATUS_CHANGED',
  actorId: 'user-1',
  actorName: 'Ada Lovelace',
  fromStatus: 'NEEDS_REVIEW',
  toStatus: 'APPROVED',
  metadata: null,
  createdAt: '2026-01-10T00:00:00.000Z',
}

const assignedEvent: AssetReviewEvent = {
  id: 'event-2',
  type: 'ASSIGNED',
  actorId: 'user-1',
  actorName: 'Ada Lovelace',
  fromStatus: null,
  toStatus: null,
  metadata: null,
  createdAt: '2026-01-10T00:05:00.000Z',
}

describe('ReviewTimeline', () => {
  it('shows an empty state when there is no activity', async () => {
    useAssetTimelineMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    const screen = await render(
      <ReviewTimeline assetType='IMAGE' sourceId='image-1' />
    )

    await expect.element(screen.getByText('No activity yet.')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    useAssetTimelineMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })

    const screen = await render(
      <ReviewTimeline assetType='IMAGE' sourceId='image-1' />
    )

    await expect
      .element(screen.getByText('Failed to load timeline.'))
      .toBeInTheDocument()
  })

  it('describes a STATUS_CHANGED event in human-readable form', async () => {
    useAssetTimelineMock.mockReturnValue({
      data: [statusEvent],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <ReviewTimeline assetType='IMAGE' sourceId='image-1' />
    )

    await expect
      .element(screen.getByText('Ada Lovelace changed status to Approved'))
      .toBeInTheDocument()
  })

  it('describes an ASSIGNED event in human-readable form', async () => {
    useAssetTimelineMock.mockReturnValue({
      data: [assignedEvent],
      isLoading: false,
      isError: false,
    })

    const screen = await render(
      <ReviewTimeline assetType='IMAGE' sourceId='image-1' />
    )

    await expect
      .element(screen.getByText('Ada Lovelace assigned a reviewer'))
      .toBeInTheDocument()
  })
})

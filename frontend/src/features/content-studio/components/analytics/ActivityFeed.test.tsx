import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'

import { ActivityFeed } from './ActivityFeed'

describe('ActivityFeed', () => {
  it('shows a loading state', async () => {
    const screen = await render(
      <ActivityFeed title='Recent Activity' activity={undefined} isLoading isError={false} onPageChange={vi.fn()} />
    )

    await expect.element(screen.getByRole('status', { name: 'Loading activity' })).toBeInTheDocument()
  })

  it('shows an error state', async () => {
    const screen = await render(
      <ActivityFeed title='Recent Activity' activity={undefined} isLoading={false} isError onPageChange={vi.fn()} />
    )

    await expect.element(screen.getByText('Failed to load recent activity.')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    const screen = await render(
      <ActivityFeed
        title='Recent Activity'
        activity={{ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }}
        isLoading={false}
        isError={false}
        onPageChange={vi.fn()}
      />
    )

    await expect.element(screen.getByText('No activity yet.')).toBeInTheDocument()
  })

  it('renders items and calls onPageChange from the pagination controls', async () => {
    const onPageChange = vi.fn()
    const items = [
      {
        id: 'event-1',
        source: 'generation' as const,
        type: 'GENERATED',
        actorId: 'user-1',
        actorName: 'Ada Lovelace',
        assetType: 'IMAGE' as const,
        sourceId: 'image-1',
        description: 'Ada Lovelace generated a new IMAGE asset',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const screen = await render(
      <ActivityFeed
        title='Recent Activity'
        activity={{
          items: Array.from({ length: 25 }, (_, i) => ({ ...items[0], id: `event-${i}` })),
          pagination: { page: 1, pageSize: 20, total: 25, totalPages: 2 },
        }}
        isLoading={false}
        isError={false}
        onPageChange={onPageChange}
      />
    )

    await expect
      .element(screen.getByText('Ada Lovelace generated a new IMAGE asset').first())
      .toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})

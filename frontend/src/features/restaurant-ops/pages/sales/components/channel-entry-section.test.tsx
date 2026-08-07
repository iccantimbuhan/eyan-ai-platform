import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { SalesChannelEntry } from '../../../types/restaurant-ops'
import { ChannelEntrySection } from './channel-entry-section'

const mutateAsync = vi.fn()

vi.mock('../../../hooks/use-sales-reference', () => ({
  useSalesChannels: () => ({
    data: [
      { id: 'wolt-id', restaurantId: 'rest-1', name: 'Wolt', createdAt: '', updatedAt: '' },
      { id: 'bolt-id', restaurantId: 'rest-1', name: 'Bolt', createdAt: '', updatedAt: '' },
    ],
  }),
  useCreateSalesChannel: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../../hooks/use-sales', () => ({
  useCreateChannelEntry: () => ({ mutateAsync, isPending: false }),
  useDeleteChannelEntry: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('ChannelEntrySection', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue(undefined)
  })

  it('shows an empty state when no channel entries exist yet', async () => {
    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await expect.element(screen.getByText('No channel entries yet.')).toBeInTheDocument()
  })

  // The spec's own worked example: Wolt €229.05.
  it('renders already-recorded entries', async () => {
    const entries: SalesChannelEntry[] = [
      { id: 'entry-1', salesChannelId: 'wolt-id', channelName: 'Wolt', amount: '229.05', createdAt: '' },
    ]

    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={entries} />
    )

    await expect.element(screen.getByText('Wolt: €229.05')).toBeInTheDocument()
  })

  it('submits a new channel entry for the given sales record', async () => {
    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await screen.getByRole('combobox').click()
    await screen.getByRole('option', { name: 'Wolt' }).click()
    await userEvent.fill(screen.getByPlaceholder('Amount'), '229.05')
    await screen.getByRole('button', { name: 'Add channel entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith({
      salesId: 'sales-1',
      salesChannelId: 'wolt-id',
      amount: 229.05,
    })
  })
})

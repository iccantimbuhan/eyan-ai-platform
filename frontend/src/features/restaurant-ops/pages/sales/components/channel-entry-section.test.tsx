import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { SalesChannelEntry } from '../../../types/restaurant-ops'
import { ChannelEntrySection } from './channel-entry-section'

const mutateAsync = vi.fn()
const createPosSourceMutateAsync = vi.fn()

vi.mock('../../../hooks/use-sales-reference', () => ({
  useSalesChannels: () => ({
    data: [
      { id: 'wolt-id', restaurantId: 'rest-1', name: 'Wolt', createdAt: '', updatedAt: '' },
      { id: 'bolt-id', restaurantId: 'rest-1', name: 'Bolt', createdAt: '', updatedAt: '' },
    ],
  }),
  useCreateSalesChannel: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePosSources: () => ({
    data: [{ id: 'pos-1-id', restaurantId: 'rest-1', name: 'POS 1', createdAt: '', updatedAt: '' }],
  }),
  useCreatePosSource: () => ({ mutateAsync: createPosSourceMutateAsync, isPending: false }),
}))

vi.mock('../../../hooks/use-sales', () => ({
  useCreateChannelEntry: () => ({ mutateAsync, isPending: false }),
  useDeleteChannelEntry: () => ({ mutate: vi.fn(), isPending: false }),
}))

function entry(overrides: Partial<SalesChannelEntry> = {}): SalesChannelEntry {
  return {
    id: 'entry-1',
    salesChannelId: 'wolt-id',
    channelName: 'Wolt',
    posSourceId: null,
    posSourceName: null,
    amount: '229.05',
    transactionCount: null,
    createdAt: '',
    ...overrides,
  }
}

describe('ChannelEntrySection', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue(undefined)
    createPosSourceMutateAsync.mockReset()
    createPosSourceMutateAsync.mockResolvedValue({ id: 'new-pos-id', name: 'POS 2' })
  })

  it('shows an empty state when no channel entries exist yet', async () => {
    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await expect.element(screen.getByText('No channel entries yet.')).toBeInTheDocument()
  })

  // The spec's own worked example: Wolt €229.05.
  it('renders already-recorded entries', async () => {
    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={[entry()]} />
    )

    await expect.element(screen.getByText('Wolt: €229.05')).toBeInTheDocument()
  })

  it('shows the POS source and transaction count on an entry when present', async () => {
    const screen = await render(
      <ChannelEntrySection
        restaurantId='rest-1'
        salesId='sales-1'
        entries={[entry({ posSourceName: 'POS 1', transactionCount: 12 })]}
      />
    )

    await expect.element(screen.getByText('Wolt: €229.05 (POS 1) (12 tx)')).toBeInTheDocument()
  })

  it('submits a new channel entry with no POS source for the given sales record', async () => {
    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await screen.getByRole('combobox', { name: 'Channel' }).click()
    await screen.getByRole('option', { name: 'Wolt' }).click()
    await userEvent.fill(screen.getByPlaceholder('Amount'), '229.05')
    await screen.getByRole('button', { name: 'Add channel entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith({
      salesId: 'sales-1',
      salesChannelId: 'wolt-id',
      amount: 229.05,
      posSourceId: undefined,
      transactionCount: undefined,
    })
  })

  it('submits a channel entry with a selected POS source and transaction count — Example B (multiple POS terminals)', async () => {
    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await screen.getByRole('combobox', { name: 'Channel' }).click()
    await screen.getByRole('option', { name: 'Wolt' }).click()
    await screen.getByRole('combobox', { name: 'POS source' }).click()
    await screen.getByRole('option', { name: 'POS 1' }).click()
    await userEvent.fill(screen.getByPlaceholder('Amount'), '486.49')
    await userEvent.fill(screen.getByPlaceholder('Tx #'), '25')
    await screen.getByRole('button', { name: 'Add channel entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith({
      salesId: 'sales-1',
      salesChannelId: 'wolt-id',
      amount: 486.49,
      posSourceId: 'pos-1-id',
      transactionCount: 25,
    })
  })

  it('allows adding a new POS source inline', async () => {
    const screen = await render(
      <ChannelEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />
    )

    await userEvent.fill(screen.getByPlaceholder('New POS source (e.g. POS 1)'), 'POS 2')
    await screen.getByRole('button', { name: 'Add POS Source' }).click()

    expect(createPosSourceMutateAsync).toHaveBeenCalledWith('POS 2')
  })
})

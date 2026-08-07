import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { MenuItem } from '../../../types/restaurant-ops'
import { ChannelPricesDialog } from './channel-prices-dialog'

const upsertMutateAsync = vi.fn()
const removeMutateAsync = vi.fn()

let channelPricesData: {
  id: string
  restaurantId: string
  salesChannelId: string
  channelName: string
  menuItemId: string
  price: string | null
  available: boolean
  createdAt: string
  updatedAt: string
}[] = []

vi.mock('../../../hooks/use-sales-reference', () => ({
  useSalesChannels: () => ({
    data: [
      { id: 'wolt-id', restaurantId: 'rest-1', name: 'Wolt', createdAt: '', updatedAt: '' },
      { id: 'bolt-id', restaurantId: 'rest-1', name: 'Bolt', createdAt: '', updatedAt: '' },
    ],
  }),
  useSalesChannelMenuItems: () => ({ data: channelPricesData }),
  useUpsertSalesChannelMenuItem: () => ({ mutateAsync: upsertMutateAsync, isPending: false }),
  useDeleteSalesChannelMenuItem: () => ({ mutateAsync: removeMutateAsync, isPending: false }),
}))

const item: MenuItem = {
  id: 'item-margherita',
  restaurantId: 'rest-1',
  menuCategoryId: 'cat-pizza',
  name: 'Margherita',
  description: null,
  price: '13.95',
  imagePath: null,
  available: true,
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
}

describe('ChannelPricesDialog', () => {
  beforeEach(() => {
    upsertMutateAsync.mockReset().mockResolvedValue(undefined)
    removeMutateAsync.mockReset().mockResolvedValue(undefined)
    channelPricesData = []
  })

  it('shows the base price and one row per sales channel', async () => {
    const screen = await render(
      <ChannelPricesDialog item={item} restaurantId='rest-1' open={true} onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByText(/Base price: €13.95/)).toBeInTheDocument()
    await expect.element(screen.getByText('Wolt')).toBeInTheDocument()
    await expect.element(screen.getByText('Bolt')).toBeInTheDocument()
  })

  it('saves a channel-specific price override without touching the base price', async () => {
    const screen = await render(
      <ChannelPricesDialog item={item} restaurantId='rest-1' open={true} onOpenChange={vi.fn()} />
    )

    await userEvent.fill(screen.getByLabelText('Wolt price'), '15.50')
    await screen.getByRole('button', { name: 'Save' }).first().click()

    expect(upsertMutateAsync).toHaveBeenCalledWith({
      menuItemId: 'item-margherita',
      salesChannelId: 'wolt-id',
      payload: { price: 15.5, available: true },
    })
    await expect.element(screen.getByText(/Base price: €13.95/)).toBeInTheDocument()
  })

  it('shows a "Clear" action only for a channel that already has an override, reverting to the base price', async () => {
    channelPricesData = [
      {
        id: 'scmi-1',
        restaurantId: 'rest-1',
        salesChannelId: 'wolt-id',
        channelName: 'Wolt',
        menuItemId: 'item-margherita',
        price: '15.50',
        available: true,
        createdAt: '',
        updatedAt: '',
      },
    ]

    const screen = await render(
      <ChannelPricesDialog item={item} restaurantId='rest-1' open={true} onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByLabelText('Wolt price')).toHaveValue('15.50')
    await expect.element(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Clear' }).click()

    expect(removeMutateAsync).toHaveBeenCalledWith({ menuItemId: 'item-margherita', salesChannelId: 'wolt-id' })
  })

  it('toggles availability per channel', async () => {
    const screen = await render(
      <ChannelPricesDialog item={item} restaurantId='rest-1' open={true} onOpenChange={vi.fn()} />
    )

    await screen.getByLabelText('Bolt available').click()
    await screen.getByRole('button', { name: 'Save' }).last().click()

    expect(upsertMutateAsync).toHaveBeenCalledWith({
      menuItemId: 'item-margherita',
      salesChannelId: 'bolt-id',
      payload: { price: null, available: false },
    })
  })
})

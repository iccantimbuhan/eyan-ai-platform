import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { SalesItemEntry } from '../../../types/restaurant-ops'
import { ItemEntrySection } from './item-entry-section'

const mutateAsync = vi.fn()

vi.mock('../../../hooks/use-menu-categories', () => ({
  useMenuCategories: () => ({
    data: [
      { id: 'cat-pizza', restaurantId: 'rest-1', name: 'Pizza', displayOrder: 0, createdAt: '', updatedAt: '' },
      { id: 'cat-drinks', restaurantId: 'rest-1', name: 'Drinks', displayOrder: 1, createdAt: '', updatedAt: '' },
    ],
  }),
}))

vi.mock('../../../hooks/use-menu-items', () => ({
  useMenuItems: () => ({
    data: [
      {
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
      },
      {
        id: 'item-coke',
        restaurantId: 'rest-1',
        menuCategoryId: 'cat-drinks',
        name: 'Coke',
        description: null,
        price: '3.00',
        imagePath: null,
        available: true,
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      },
    ],
  }),
}))

vi.mock('../../../hooks/use-sales-reference', () => ({
  useSalesChannels: () => ({
    data: [{ id: 'wolt-id', restaurantId: 'rest-1', name: 'Wolt', createdAt: '', updatedAt: '' }],
  }),
  useSalesChannelMenuItems: () => ({
    data: [
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
    ],
  }),
}))

vi.mock('../../../hooks/use-sales', () => ({
  useCreateItemEntry: () => ({ mutateAsync, isPending: false }),
  useDeleteItemEntry: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('ItemEntrySection', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue(undefined)
  })

  it('shows an empty state when no item entries exist yet', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await expect.element(screen.getByText('No itemized sales yet.')).toBeInTheDocument()
  })

  it('filters the Menu Item dropdown to the selected Category', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await screen.getByRole('combobox', { name: 'Category' }).click()
    await screen.getByRole('option', { name: 'Pizza' }).click()

    await screen.getByRole('combobox', { name: 'Menu item (optional)' }).click()
    await expect.element(screen.getByRole('option', { name: 'Margherita' })).toBeInTheDocument()
    await expect.element(screen.getByRole('option', { name: 'Coke' })).not.toBeInTheDocument()
  })

  it('selecting a menu item populates the item name and its base price', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await screen.getByRole('combobox', { name: 'Menu item (optional)' }).click()
    await screen.getByRole('option', { name: 'Margherita' }).click()

    await expect.element(screen.getByPlaceholder('Item name')).toHaveValue('Margherita')
    await expect.element(screen.getByPlaceholder('Amount')).toHaveValue('13.95')
  })

  it('selecting a sales channel first uses the channel-specific price as the default amount', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await screen.getByRole('combobox', { name: 'Sales channel (optional)' }).click()
    await screen.getByRole('option', { name: 'Wolt' }).click()

    await screen.getByRole('combobox', { name: 'Menu item (optional)' }).click()
    await screen.getByRole('option', { name: 'Margherita' }).click()

    await expect.element(screen.getByPlaceholder('Amount')).toHaveValue('15.50')
  })

  it('preserves the ability to manually override the populated amount', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await screen.getByRole('combobox', { name: 'Menu item (optional)' }).click()
    await screen.getByRole('option', { name: 'Margherita' }).click()
    await userEvent.fill(screen.getByPlaceholder('Amount'), '12.00')

    await expect.element(screen.getByPlaceholder('Amount')).toHaveValue('12.00')
  })

  it('supports a fully manual entry with no category or menu item selected (POS items not on the menu)', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await userEvent.fill(screen.getByPlaceholder('Item name'), 'Bottled Water')
    await userEvent.fill(screen.getByPlaceholder('Qty', { exact: true }), '2')
    await userEvent.fill(screen.getByPlaceholder('Amount'), '4.00')
    await screen.getByRole('button', { name: 'Add item entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ menuItemId: undefined, itemName: 'Bottled Water', quantity: 2, amount: 4 })
    )
  })

  it('submits optional POS % Qty and POS % Sales alongside the entry', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await userEvent.fill(screen.getByPlaceholder('Item name'), 'Margherita')
    await userEvent.fill(screen.getByPlaceholder('Qty', { exact: true }), '6')
    await userEvent.fill(screen.getByPlaceholder('Amount'), '63.00')
    await userEvent.fill(screen.getByLabelText('POS % Qty'), '33.33')
    await userEvent.fill(screen.getByLabelText('POS % Sales'), '29.90')
    await screen.getByRole('button', { name: 'Add item entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ posQuantityPercent: 33.33, posSalesPercent: 29.9 })
    )
  })

  it('submits without POS percentages when left blank', async () => {
    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={[]} />)

    await userEvent.fill(screen.getByPlaceholder('Item name'), 'Bottled Water')
    await userEvent.fill(screen.getByPlaceholder('Qty', { exact: true }), '2')
    await userEvent.fill(screen.getByPlaceholder('Amount'), '4.00')
    await screen.getByRole('button', { name: 'Add item entry' }).click()

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ posQuantityPercent: undefined, posSalesPercent: undefined })
    )
  })

  it('renders POS percentages on an already-recorded entry, labeled as POS-reported', async () => {
    const entries: SalesItemEntry[] = [
      {
        id: 'entry-1',
        menuItemId: null,
        itemName: 'Margherita',
        categoryName: 'Pizza',
        quantity: '6.00',
        amount: '63.00',
        posQuantityPercent: '33.33',
        posSalesPercent: '29.90',
        createdAt: '',
      },
    ]

    const screen = await render(<ItemEntrySection restaurantId='rest-1' salesId='sales-1' entries={entries} />)

    await expect.element(screen.getByText(/POS 33.33% qty, 29.90% sales/)).toBeInTheDocument()
  })
})

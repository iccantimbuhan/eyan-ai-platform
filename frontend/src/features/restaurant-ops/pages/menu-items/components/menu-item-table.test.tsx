import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { MenuCategory, MenuItem } from '../../../types/restaurant-ops'
import { MenuItemTable } from './menu-item-table'

// Each row's actions menu renders MenuItemDialog/DeleteMenuItemDialog,
// which call real react-query mutation hooks — mocked here the same way
// channel-entry-section.test.tsx mocks its own hook module, so this stays a
// plain component test with no QueryClientProvider wrapper.
vi.mock('../../../hooks/use-menu-items', () => ({
  useCreateMenuItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMenuItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMenuItem: () => ({ mutate: vi.fn(), isPending: false }),
}))

// Each row's actions menu also renders ChannelPricesDialog (Sprint 2B
// Prep), which calls real react-query hooks — mocked the same way.
vi.mock('../../../hooks/use-sales-reference', () => ({
  useSalesChannels: () => ({ data: [] }),
  useSalesChannelMenuItems: () => ({ data: [] }),
  useUpsertSalesChannelMenuItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSalesChannelMenuItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const categories: MenuCategory[] = [
  { id: 'cat-pizza', restaurantId: 'rest-1', name: 'Pizza', displayOrder: 0, createdAt: '', updatedAt: '' },
  { id: 'cat-drinks', restaurantId: 'rest-1', name: 'Drinks', displayOrder: 1, createdAt: '', updatedAt: '' },
]

function item(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
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
    ...overrides,
  }
}

const items: MenuItem[] = [
  item({ id: 'item-1', name: 'Margherita', menuCategoryId: 'cat-pizza' }),
  item({ id: 'item-2', name: 'Carbonara', menuCategoryId: 'cat-pizza' }),
  item({ id: 'item-3', name: 'Coke', menuCategoryId: 'cat-drinks' }),
]

describe('MenuItemTable — category filter', () => {
  it('renders a Category filter control alongside Status', async () => {
    const screen = await render(<MenuItemTable items={items} categories={categories} />)

    await expect.element(screen.getByRole('button', { name: 'Filter by Category' })).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Filter by Status' })).toBeInTheDocument()
  })

  it('selecting a category filters the table to only that category', async () => {
    const screen = await render(<MenuItemTable items={items} categories={categories} />)

    await expect.element(screen.getByText('Coke')).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Filter by Category' }).click()
    await screen.getByRole('option', { name: 'Pizza' }).click()
    await userEvent.keyboard('{Escape}')

    await expect.element(screen.getByText('Margherita')).toBeInTheDocument()
    await expect.element(screen.getByText('Carbonara')).toBeInTheDocument()
    await expect.element(screen.getByText('Coke')).not.toBeInTheDocument()
  })

  it('composes search and category filter together', async () => {
    const screen = await render(<MenuItemTable items={items} categories={categories} />)

    await screen.getByRole('button', { name: 'Filter by Category' }).click()
    await screen.getByRole('option', { name: 'Pizza' }).click()
    await userEvent.keyboard('{Escape}')

    await userEvent.fill(screen.getByPlaceholder('Search menu items...'), 'Carbonara')

    await expect.element(screen.getByText('Carbonara')).toBeInTheDocument()
    await expect.element(screen.getByText('Margherita')).not.toBeInTheDocument()
  })

  it('shows a clear empty state when the category filter matches nothing', async () => {
    const screen = await render(<MenuItemTable items={items} categories={categories} />)

    await screen.getByRole('button', { name: 'Filter by Category' }).click()
    await screen.getByRole('option', { name: 'Drinks' }).click()
    await userEvent.keyboard('{Escape}')
    await userEvent.fill(screen.getByPlaceholder('Search menu items...'), 'Margherita')

    await expect.element(screen.getByText('No menu items match your filters.')).toBeInTheDocument()
  })
})

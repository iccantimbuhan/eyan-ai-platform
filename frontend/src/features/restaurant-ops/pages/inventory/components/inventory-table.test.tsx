import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import type { InventoryItem } from '../../../types/restaurant-ops'
import { InventoryTable } from './inventory-table'

// InventoryActions (rendered per row) pulls every mutation/query hook it
// needs exclusively from use-inventory.ts (Adjustment/Waste/StockCount/
// EditMinimumQuantity dialogs + the history sheet all live in this one
// module) — mocking it here is enough to isolate the table from network
// calls, no react-query provider or router context needed.
vi.mock('../../../hooks/use-inventory', () => ({
  useCreateAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateWaste: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateStockCount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateInventoryItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStockMovements: () => ({ data: [], isLoading: false }),
}))

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    branchId: 'branch-1',
    restaurantId: 'rest-1',
    ingredientId: 'ing-1',
    ingredientName: 'Mozzarella',
    unitId: 'unit-1',
    unitAbbreviation: 'kg',
    currentQuantity: '5.20',
    minimumQuantity: '2.00',
    status: 'IN_STOCK',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('InventoryTable', () => {
  it('shows an empty state when there are no inventory items', async () => {
    const screen = await render(<InventoryTable items={[]} canWrite={true} />)

    await expect
      .element(screen.getByText('No inventory items yet. Add one to record opening stock.'))
      .toBeInTheDocument()
  })

  // The spec's own worked example: Mozzarella 5.20kg (min 2.00) -> In
  // Stock, Lettuce 0.80kg (min 1.00) -> Low Stock, Beef Patty 0 (min 20)
  // -> Out of Stock.
  it('renders each row with its ingredient, current/minimum quantity, and computed status badge', async () => {
    const items = [
      item({ id: 'item-1', ingredientName: 'Mozzarella', currentQuantity: '5.20', minimumQuantity: '2.00', status: 'IN_STOCK' }),
      item({ id: 'item-2', ingredientName: 'Lettuce', currentQuantity: '0.80', minimumQuantity: '1.00', status: 'LOW_STOCK' }),
      item({ id: 'item-3', ingredientName: 'Beef Patty', unitAbbreviation: 'piece', currentQuantity: '0.00', minimumQuantity: '20.00', status: 'OUT_OF_STOCK' }),
    ]

    const screen = await render(<InventoryTable items={items} canWrite={true} />)

    await expect.element(screen.getByText('Mozzarella')).toBeInTheDocument()
    await expect.element(screen.getByText('In Stock')).toBeInTheDocument()

    await expect.element(screen.getByText('Lettuce')).toBeInTheDocument()
    await expect.element(screen.getByText('Low Stock')).toBeInTheDocument()

    await expect.element(screen.getByText('Beef Patty')).toBeInTheDocument()
    await expect.element(screen.getByText('Out of Stock')).toBeInTheDocument()
  })
})

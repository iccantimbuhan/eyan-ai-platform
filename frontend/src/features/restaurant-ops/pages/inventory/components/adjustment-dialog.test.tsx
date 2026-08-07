import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { InventoryItem } from '../../../types/restaurant-ops'
import { AdjustmentDialog } from './adjustment-dialog'

const mutateAsync = vi.fn()

vi.mock('../../../hooks/use-inventory', () => ({
  useCreateAdjustment: () => ({ mutateAsync, isPending: false }),
}))

const testItem: InventoryItem = {
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
}

describe('AdjustmentDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue(undefined)
  })

  // The spec's own worked example: Mozzarella at 5.20kg, adjustment
  // -0.50kg, reason "Damaged product".
  it('submits the signed delta and reason for the target inventory item', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <AdjustmentDialog open={true} onOpenChange={onOpenChange} item={testItem} />
    )

    await userEvent.fill(screen.getByLabelText(/Adjustment/i), '-0.50')
    await userEvent.fill(screen.getByLabelText(/Reason/i), 'Damaged product')
    await userEvent.click(screen.getByRole('button', { name: /Record Adjustment/i }))

    expect(mutateAsync).toHaveBeenCalledWith({
      inventoryItemId: 'item-1',
      quantityDelta: -0.5,
      reason: 'Damaged product',
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows the ingredient name and current quantity in the description', async () => {
    const screen = await render(
      <AdjustmentDialog open={true} onOpenChange={vi.fn()} item={testItem} />
    )

    await expect
      .element(screen.getByText('Mozzarella — currently 5.20 kg'))
      .toBeInTheDocument()
  })
})

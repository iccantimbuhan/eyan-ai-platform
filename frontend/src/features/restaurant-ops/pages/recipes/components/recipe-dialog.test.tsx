import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import type { MenuItem, Recipe } from '../../../types/restaurant-ops'
import { RecipeDialog } from './recipe-dialog'

const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()

vi.mock('../../../hooks/use-recipes', () => ({
  useCreateRecipe: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateRecipe: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}))

const items: MenuItem[] = [
  {
    id: 'item-1',
    restaurantId: 'rest-1',
    menuCategoryId: 'cat-1',
    name: 'Carbonara',
    description: null,
    price: '12.00',
    imagePath: null,
    available: true,
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
  },
]

describe('RecipeDialog', () => {
  it('creates a recipe for the selected menu item — the "Add Recipe" flow works end to end', async () => {
    createMutateAsync.mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    const screen = await render(
      <RecipeDialog restaurantId='rest-1' availableMenuItems={items} open={true} onOpenChange={onOpenChange} />
    )

    await screen.getByRole('combobox').click()
    await screen.getByRole('option', { name: 'Carbonara' }).click()
    await screen.getByRole('button', { name: 'Add Recipe' }).click()

    expect(createMutateAsync).toHaveBeenCalledWith({ menuItemId: 'item-1', notes: null })
  })

  // Notes is manager-facing prep guidance, never a system-status field —
  // the dialog should say so, and the placeholder should model real
  // examples rather than a bare "optional".
  it('explains that Notes is optional prep guidance, not a status field', async () => {
    const screen = await render(
      <RecipeDialog restaurantId='rest-1' availableMenuItems={items} open={true} onOpenChange={vi.fn()} />
    )

    await expect
      .element(screen.getByText(/Optional prep or operational instructions/))
      .toBeInTheDocument()
    await expect
      .element(screen.getByPlaceholder(/Prepare dough 24 hours in advance/))
      .toBeInTheDocument()
  })

  it('edit mode saves updated notes without touching the menu item', async () => {
    updateMutateAsync.mockResolvedValue(undefined)
    const recipe: Recipe = {
      id: 'recipe-1',
      restaurantId: 'rest-1',
      menuItemId: 'item-1',
      notes: null,
      ingredients: [],
      createdAt: '',
      updatedAt: '',
    }

    const screen = await render(
      <RecipeDialog
        restaurantId='rest-1'
        availableMenuItems={items}
        recipe={recipe}
        menuItemName='Carbonara'
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    await screen.getByPlaceholder(/Prepare dough 24 hours in advance/).fill('Chicken is pre-marinated.')
    await screen.getByRole('button', { name: 'Save Changes' }).click()

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'recipe-1',
      payload: { notes: 'Chicken is pre-marinated.' },
    })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import type { MenuItem, Recipe } from '../../../types/restaurant-ops'
import { RecipeTable } from './recipe-table'

vi.mock('../../../hooks/use-recipes', () => ({
  useCreateRecipe: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRecipe: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRecipe: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRecipeIngredient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRecipeIngredient: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../../hooks/use-ingredients', () => ({
  useIngredients: () => ({ data: [{ id: 'ing-1', name: 'Spaghetti' }] }),
}))

vi.mock('../../../hooks/use-units', () => ({
  useUnits: () => ({ data: [{ id: 'unit-1', abbreviation: 'g' }] }),
}))

const menuItems: MenuItem[] = [
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

const recipes: Recipe[] = [
  {
    id: 'recipe-1',
    restaurantId: 'rest-1',
    menuItemId: 'item-1',
    notes: null,
    ingredients: [
      { id: 'ri-1', ingredientId: 'ing-1', ingredientName: 'Spaghetti', unitId: 'unit-1', unitAbbreviation: 'g', quantity: '100.00' },
    ],
    createdAt: '',
    updatedAt: '',
  },
]

describe('RecipeTable — clickable menu item opens Manage Recipe', () => {
  it('shows "No notes" instead of confusing placeholder text when notes is empty', async () => {
    const screen = await render(<RecipeTable recipes={recipes} menuItems={menuItems} availableMenuItems={[]} />)

    await expect.element(screen.getByText('No notes')).toBeInTheDocument()
  })

  it('clicking the menu item name opens the same Recipe Ingredients dialog as "Manage Ingredients"', async () => {
    const screen = await render(<RecipeTable recipes={recipes} menuItems={menuItems} availableMenuItems={[]} />)

    await screen.getByRole('button', { name: 'Carbonara' }).click()

    await expect.element(screen.getByText('Recipe Ingredients')).toBeInTheDocument()
    await expect.element(screen.getByText('100.00 g Spaghetti')).toBeInTheDocument()
  })

  it('opens the identical dialog via the row actions menu\'s "Manage Ingredients" item', async () => {
    const screen = await render(<RecipeTable recipes={recipes} menuItems={menuItems} availableMenuItems={[]} />)

    await screen.getByRole('button', { name: 'Recipe actions' }).click()
    await screen.getByRole('menuitem', { name: 'Manage Ingredients' }).click()

    await expect.element(screen.getByText('Recipe Ingredients')).toBeInTheDocument()
    await expect.element(screen.getByText('100.00 g Spaghetti')).toBeInTheDocument()
  })
})

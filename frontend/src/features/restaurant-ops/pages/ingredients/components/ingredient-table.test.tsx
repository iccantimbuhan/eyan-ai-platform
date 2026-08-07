import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { Ingredient, IngredientCategory } from '../../../types/restaurant-ops'
import { IngredientTable } from './ingredient-table'

// Each row's actions menu renders IngredientDialog/DeleteIngredientDialog,
// which call real react-query hooks — mocked the same way
// menu-item-table.test.tsx mocks its own row-action hooks, so this stays a
// plain component test with no QueryClientProvider wrapper.
vi.mock('../../../hooks/use-ingredients', () => ({
  useCreateIngredient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateIngredient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteIngredient: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../../hooks/use-ingredient-categories', () => ({
  useIngredientCategories: () => ({ data: [] }),
}))

vi.mock('../../../hooks/use-suppliers', () => ({
  useSuppliers: () => ({ data: [] }),
}))

const categories: IngredientCategory[] = [
  { id: 'cat-produce', restaurantId: 'rest-1', name: 'Produce', createdAt: '', updatedAt: '' },
  { id: 'cat-dairy', restaurantId: 'rest-1', name: 'Dairy', createdAt: '', updatedAt: '' },
]

function ingredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    restaurantId: 'rest-1',
    ingredientCategoryId: 'cat-produce',
    name: 'Tomato',
    suppliers: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

const ingredients: Ingredient[] = [
  ingredient({ id: 'ing-1', name: 'Tomato', ingredientCategoryId: 'cat-produce' }),
  ingredient({ id: 'ing-2', name: 'Lettuce', ingredientCategoryId: 'cat-produce' }),
  ingredient({ id: 'ing-3', name: 'Mozzarella', ingredientCategoryId: 'cat-dairy' }),
]

describe('IngredientTable — category filter', () => {
  it('renders a Category filter control', async () => {
    const screen = await render(<IngredientTable ingredients={ingredients} categories={categories} />)

    await expect.element(screen.getByRole('button', { name: 'Filter by Category' })).toBeInTheDocument()
  })

  it('selecting a category filters the table to only that category, restaurant-scoped', async () => {
    const screen = await render(<IngredientTable ingredients={ingredients} categories={categories} />)

    await expect.element(screen.getByText('Mozzarella')).toBeInTheDocument()

    await screen.getByRole('button', { name: 'Filter by Category' }).click()
    await screen.getByRole('option', { name: 'Produce' }).click()
    await userEvent.keyboard('{Escape}')

    await expect.element(screen.getByText('Tomato')).toBeInTheDocument()
    await expect.element(screen.getByText('Lettuce')).toBeInTheDocument()
    await expect.element(screen.getByText('Mozzarella')).not.toBeInTheDocument()
  })

  it('composes search and category filter together', async () => {
    const screen = await render(<IngredientTable ingredients={ingredients} categories={categories} />)

    await screen.getByRole('button', { name: 'Filter by Category' }).click()
    await screen.getByRole('option', { name: 'Produce' }).click()
    await userEvent.keyboard('{Escape}')

    await userEvent.fill(screen.getByPlaceholder('Search ingredients...'), 'Lettuce')

    await expect.element(screen.getByText('Lettuce')).toBeInTheDocument()
    await expect.element(screen.getByText('Tomato')).not.toBeInTheDocument()
  })

  it('shows a clear empty state when the category filter matches nothing', async () => {
    const screen = await render(<IngredientTable ingredients={ingredients} categories={categories} />)

    await screen.getByRole('button', { name: 'Filter by Category' }).click()
    await screen.getByRole('option', { name: 'Dairy' }).click()
    await userEvent.keyboard('{Escape}')
    await userEvent.fill(screen.getByPlaceholder('Search ingredients...'), 'Tomato')

    await expect.element(screen.getByText('No ingredients match your filters.')).toBeInTheDocument()
  })
})

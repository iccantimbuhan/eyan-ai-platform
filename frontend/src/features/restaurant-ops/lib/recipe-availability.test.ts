import { describe, expect, it } from 'vitest'
import { computeRecipeAvailability } from './recipe-availability'

describe('computeRecipeAvailability', () => {
  it('allows adding a recipe when at least one menu item has none yet', () => {
    const result = computeRecipeAvailability(true, 62, 26)

    expect(result.canAddRecipe).toBe(true)
    expect(result.reason).toBeNull()
  })

  // Regression test for the real "Add Recipe doesn't work" report — for a
  // restaurant where every menu item already has a recipe (confirmed live:
  // Topo Gigio Pizzeria, 32/32), the button was silently disabled with no
  // explanation, which read as broken. The fix is this reason string, not
  // hiding or further disabling the button.
  it('disables adding a recipe and explains why when every menu item already has one', () => {
    const result = computeRecipeAvailability(true, 32, 0)

    expect(result.canAddRecipe).toBe(false)
    expect(result.reason).toBe('Every menu item already has a recipe.')
  })

  it('disables adding a recipe and explains why when the restaurant has no menu items at all', () => {
    const result = computeRecipeAvailability(true, 0, 0)

    expect(result.canAddRecipe).toBe(false)
    expect(result.reason).toBe('Add a menu item first — recipes link to an existing menu item.')
  })

  it('disables adding a recipe when no restaurant is selected, without a misleading reason', () => {
    const result = computeRecipeAvailability(false, 62, 26)

    expect(result.canAddRecipe).toBe(false)
    expect(result.reason).toBeNull()
  })
})

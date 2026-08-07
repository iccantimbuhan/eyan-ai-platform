export interface RecipeAvailability {
  canAddRecipe: boolean
  reason: string | null
}

// The "Add Recipe" button is legitimately disabled in two distinct cases —
// this exists specifically so the page can surface WHICH one applies. A
// disabled button with no explanation reads as broken to a manager, which
// was the actual root cause behind "clicking Add Recipe does nothing": for
// a restaurant where every menu item already has a recipe, the button was
// silently disabled with zero feedback.
export function computeRecipeAvailability(
  hasRestaurant: boolean,
  totalMenuItemCount: number,
  availableMenuItemCount: number
): RecipeAvailability {
  const hasMenuItems = totalMenuItemCount > 0
  const canAddRecipe = hasRestaurant && availableMenuItemCount > 0

  const reason = !hasMenuItems
    ? 'Add a menu item first — recipes link to an existing menu item.'
    : availableMenuItemCount === 0
      ? 'Every menu item already has a recipe.'
      : null

  return { canAddRecipe, reason }
}

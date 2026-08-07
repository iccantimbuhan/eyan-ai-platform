import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useTenantStore } from '@/stores/tenant-store'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { computeRecipeAvailability } from '../../lib/recipe-availability'
import { useMenuItems } from '../../hooks/use-menu-items'
import { useRecipes } from '../../hooks/use-recipes'
import { RecipeDialog } from './components/recipe-dialog'
import { RecipeTable } from './components/recipe-table'

export function RestaurantOpsRecipesPage() {
  const can = useCan()
  const { restaurantId, restaurants, isLoading: isTenantLoading } = useActiveTenant()
  const setActiveRestaurant = useTenantStore((state) => state.tenant.setActiveRestaurant)
  const { data: recipes, isLoading, error } = useRecipes(restaurantId ?? '')
  const { data: menuItems } = useMenuItems(restaurantId ?? '')
  const createDialog = useDialogState()

  const availableMenuItems = useMemo(() => {
    const recipeMenuItemIds = new Set((recipes ?? []).map((recipe) => recipe.menuItemId))
    return (menuItems ?? []).filter((item) => !recipeMenuItemIds.has(item.id))
  }, [recipes, menuItems])

  const { canAddRecipe, reason: addRecipeReason } = computeRecipeAvailability(
    Boolean(restaurantId),
    menuItems?.length ?? 0,
    availableMenuItems.length
  )

  if (!can('restaurant')) return <ForbiddenError />

  if (isTenantLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>Loading...</div>
      </Main>
    )
  }

  if (restaurants.length === 0) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-muted-foreground'>
          No restaurants yet — add one under Restaurant Operations &rarr; Restaurants first.
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title='Recipes'
          description='What ingredients are consumed when each menu item is sold.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Recipes' },
          ]}
          actions={
            <Button onClick={createDialog.openDialog} disabled={!canAddRecipe}>
              Add Recipe
            </Button>
          }
        />

        <Select value={restaurantId} onValueChange={setActiveRestaurant}>
          <SelectTrigger className='w-full sm:w-64'>
            <SelectValue placeholder='Select a restaurant' />
          </SelectTrigger>

          <SelectContent>
            {restaurants.map((restaurant) => (
              <SelectItem key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isLoading && addRecipeReason && (
          <p className='text-sm text-muted-foreground'>{addRecipeReason}</p>
        )}

        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>Loading recipes...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load recipes.
          </div>
        ) : (
          <RecipeTable
            recipes={recipes ?? []}
            menuItems={menuItems ?? []}
            availableMenuItems={availableMenuItems}
          />
        )}
      </Main>

      {restaurantId && (
        <RecipeDialog
          restaurantId={restaurantId}
          availableMenuItems={availableMenuItems}
          open={createDialog.open}
          onOpenChange={createDialog.setOpen}
        />
      )}
    </>
  )
}

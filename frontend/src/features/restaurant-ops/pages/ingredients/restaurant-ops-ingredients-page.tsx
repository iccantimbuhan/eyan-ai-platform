import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useTenantStore } from '@/stores/tenant-store'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { useIngredientCategories } from '../../hooks/use-ingredient-categories'
import { useIngredients } from '../../hooks/use-ingredients'
import { IngredientDialog } from './components/ingredient-dialog'
import { IngredientTable } from './components/ingredient-table'

export function RestaurantOpsIngredientsPage() {
  const can = useCan()
  const { restaurantId, restaurants, isLoading: isTenantLoading } = useActiveTenant()
  const setActiveRestaurant = useTenantStore((state) => state.tenant.setActiveRestaurant)
  const { data, isLoading, error } = useIngredients(restaurantId ?? '')
  const { data: categories } = useIngredientCategories(restaurantId ?? '')
  const createDialog = useDialogState()

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
          title='Ingredients'
          description='The selected restaurant&rsquo;s raw and purchasable products.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Ingredients' },
          ]}
          actions={
            <Button onClick={createDialog.openDialog} disabled={!restaurantId}>
              Add Ingredient
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

        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>Loading ingredients...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load ingredients.
          </div>
        ) : (
          <IngredientTable ingredients={data ?? []} categories={categories ?? []} />
        )}
      </Main>

      {restaurantId && (
        <IngredientDialog
          restaurantId={restaurantId}
          open={createDialog.open}
          onOpenChange={createDialog.setOpen}
        />
      )}
    </>
  )
}

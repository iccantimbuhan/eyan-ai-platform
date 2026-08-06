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
import { IngredientCategoryDialog } from './components/ingredient-category-dialog'
import { IngredientCategoryTable } from './components/ingredient-category-table'

export function RestaurantOpsIngredientCategoriesPage() {
  const can = useCan()
  const { restaurantId, restaurants, isLoading: isTenantLoading } = useActiveTenant()
  const setActiveRestaurant = useTenantStore((state) => state.tenant.setActiveRestaurant)
  const { data, isLoading, error } = useIngredientCategories(restaurantId ?? '')
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
          title='Ingredient Categories'
          description='Group the selected restaurant&rsquo;s ingredients into categories.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Ingredient Categories' },
          ]}
          actions={
            <Button onClick={createDialog.openDialog} disabled={!restaurantId}>
              Add Category
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
          <div className='flex h-64 items-center justify-center'>Loading categories...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load ingredient categories.
          </div>
        ) : (
          <IngredientCategoryTable categories={data ?? []} />
        )}
      </Main>

      {restaurantId && (
        <IngredientCategoryDialog
          restaurantId={restaurantId}
          open={createDialog.open}
          onOpenChange={createDialog.setOpen}
        />
      )}
    </>
  )
}

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useTenantStore } from '@/stores/tenant-store'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { useMenuCategories } from '../../hooks/use-menu-categories'
import { useMenuItems } from '../../hooks/use-menu-items'
import { MenuItemDialog } from './components/menu-item-dialog'
import { MenuItemTable } from './components/menu-item-table'

export function RestaurantOpsMenuItemsPage() {
  const can = useCan()
  const { restaurantId, restaurants, isLoading: isTenantLoading } = useActiveTenant()
  const setActiveRestaurant = useTenantStore((state) => state.tenant.setActiveRestaurant)
  const { data: categories, isLoading: isCategoriesLoading } = useMenuCategories(
    restaurantId ?? ''
  )
  const { data: items, isLoading: isItemsLoading, error } = useMenuItems(restaurantId ?? '')
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

  const hasCategories = (categories?.length ?? 0) > 0
  const isLoading = isCategoriesLoading || isItemsLoading

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title='Menu Items'
          description='Manage sellable items for the selected restaurant.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Menu Items' },
          ]}
          actions={
            <Button onClick={createDialog.openDialog} disabled={!restaurantId || !hasCategories}>
              Add Item
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

        {!isLoading && !hasCategories && (
          <p className='text-sm text-muted-foreground'>
            This restaurant has no menu categories yet — add one under Menu Categories before
            adding items.
          </p>
        )}

        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>Loading menu items...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load menu items.
          </div>
        ) : (
          <MenuItemTable items={items ?? []} categories={categories ?? []} />
        )}
      </Main>

      {restaurantId && (
        <MenuItemDialog
          restaurantId={restaurantId}
          categories={categories ?? []}
          open={createDialog.open}
          onOpenChange={createDialog.setOpen}
        />
      )}
    </>
  )
}

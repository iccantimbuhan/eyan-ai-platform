import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useTenantStore } from '@/stores/tenant-store'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { useUnits } from '../../hooks/use-units'
import { UnitDialog } from './components/unit-dialog'
import { UnitTable } from './components/unit-table'

export function RestaurantOpsUnitsPage() {
  const can = useCan()
  const { restaurantId, restaurants, isLoading: isTenantLoading } = useActiveTenant()
  const setActiveRestaurant = useTenantStore((state) => state.tenant.setActiveRestaurant)
  const { data, isLoading, error } = useUnits(restaurantId ?? '')
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
          title='Units'
          description='The units of measure used across ingredients and recipes.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Units' },
          ]}
          actions={
            <Button onClick={createDialog.openDialog} disabled={!restaurantId}>
              Add Unit
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
          <div className='flex h-64 items-center justify-center'>Loading units...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load units.
          </div>
        ) : (
          <UnitTable units={data ?? []} />
        )}
      </Main>

      {restaurantId && (
        <UnitDialog
          restaurantId={restaurantId}
          open={createDialog.open}
          onOpenChange={createDialog.setOpen}
        />
      )}
    </>
  )
}

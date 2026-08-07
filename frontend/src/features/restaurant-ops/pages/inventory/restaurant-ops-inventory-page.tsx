import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useTenantStore } from '@/stores/tenant-store'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { useInventoryItems } from '../../hooks/use-inventory'
import { canWriteInventory } from '../../lib/tenant-role-labels'
import { AddInventoryItemDialog } from './components/add-inventory-item-dialog'
import { InventoryTable } from './components/inventory-table'

export function RestaurantOpsInventoryPage() {
  const can = useCan()
  const {
    restaurantId,
    restaurants,
    branchId,
    branches,
    isLoading: isTenantLoading,
  } = useActiveTenant()
  const setActiveRestaurant = useTenantStore((state) => state.tenant.setActiveRestaurant)
  const setActiveBranch = useTenantStore((state) => state.tenant.setActiveBranch)
  const { data, isLoading, error } = useInventoryItems(branchId ?? '')
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

  const activeBranch = branches.find((branch) => branch.id === branchId)
  const canWrite = canWriteInventory(activeBranch?.myRole ?? null)

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title='Inventory'
          description='Current stock, opening stock, adjustments, waste, and stock counts for the selected branch.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Inventory' },
          ]}
          actions={
            <Button onClick={createDialog.openDialog} disabled={!branchId || !canWrite}>
              Add Inventory Item
            </Button>
          }
        />

        <div className='flex flex-col gap-3 sm:flex-row'>
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

          <Select value={branchId} onValueChange={setActiveBranch}>
            <SelectTrigger className='w-full sm:w-64'>
              <SelectValue placeholder='Select a branch' />
            </SelectTrigger>

            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {branches.length === 0 ? (
          <div className='flex h-64 items-center justify-center text-muted-foreground'>
            No branches yet for this restaurant — add one under Restaurant Operations &rarr; Branches
            first.
          </div>
        ) : isLoading ? (
          <div className='flex h-64 items-center justify-center'>Loading inventory...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load inventory.
          </div>
        ) : (
          <InventoryTable items={data ?? []} canWrite={canWrite} />
        )}
      </Main>

      {branchId && restaurantId && (
        <AddInventoryItemDialog
          restaurantId={restaurantId}
          branchId={branchId}
          open={createDialog.open}
          onOpenChange={createDialog.setOpen}
        />
      )}
    </>
  )
}

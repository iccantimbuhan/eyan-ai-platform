import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { useRestaurants } from '../../hooks/use-restaurants'
import { RestaurantDialog } from './components/restaurant-dialog'
import { RestaurantTable } from './components/restaurant-table'

export function RestaurantOpsRestaurantsPage() {
  const can = useCan()
  const { organizationId, isLoading: isTenantLoading } = useActiveTenant()
  const { data, isLoading, error } = useRestaurants(organizationId ?? '')
  const createDialog = useDialogState()

  if (!can('restaurant')) return <ForbiddenError />

  if (isTenantLoading || isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>Loading restaurants...</div>
      </Main>
    )
  }

  if (!organizationId) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-muted-foreground'>
          No organization found for this account.
        </div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load restaurants.
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title='Restaurants'
          description='Manage the restaurant brands under your organization.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Restaurants' },
          ]}
          actions={<Button onClick={createDialog.openDialog}>Add Restaurant</Button>}
        />

        <RestaurantTable restaurants={data ?? []} />
      </Main>

      <RestaurantDialog
        organizationId={organizationId}
        open={createDialog.open}
        onOpenChange={createDialog.setOpen}
      />
    </>
  )
}

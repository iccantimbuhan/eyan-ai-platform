import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { useStaff } from '../../hooks/use-staff'
import { canManageStaff } from '../../lib/tenant-role-labels'
import { StaffDialog } from './components/staff-dialog'
import { StaffTable } from './components/staff-table'

export function RestaurantOpsStaffPage() {
  const can = useCan()
  const {
    organizationId,
    organizationRole,
    restaurants,
    isLoading: isTenantLoading,
  } = useActiveTenant()
  const { data, isLoading, error } = useStaff(organizationId ?? '')
  const inviteDialog = useDialogState()

  if (!can('restaurant')) return <ForbiddenError />

  if (isTenantLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>Loading...</div>
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

  // requireTenantRole('OWNER', 'MANAGER') gates every staff endpoint on the
  // backend — this mirrors that gate for a clean message instead of a raw
  // 403. Never the real enforcement; the query below would 403 either way.
  if (!canManageStaff(organizationRole)) {
    return (
      <Main>
        <div className='flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground'>
          <p>Only an Owner or Manager can manage staff.</p>
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title='Staff'
          description='Manage who has access to your restaurants and branches.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Staff' },
          ]}
          actions={<Button onClick={inviteDialog.openDialog}>Invite Staff</Button>}
        />

        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>Loading staff...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load staff.
          </div>
        ) : (
          <StaffTable staff={data ?? []} organizationId={organizationId} restaurants={restaurants} />
        )}
      </Main>

      <StaffDialog
        organizationId={organizationId}
        restaurants={restaurants}
        open={inviteDialog.open}
        onOpenChange={inviteDialog.setOpen}
      />
    </>
  )
}

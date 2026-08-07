import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useTenantStore } from '@/stores/tenant-store'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useDialogState } from '../../hooks/use-dialog-state'
import { useDailySales } from '../../hooks/use-sales'
import { canWriteSales } from '../../lib/tenant-role-labels'
import { DailySalesDialog } from './components/daily-sales-dialog'
import { ReconciliationCard } from './components/reconciliation-card'
import { SalesDetailTabs } from './components/sales-detail-tabs'
import { SalesSummaryCards } from './components/sales-summary-cards'

export function RestaurantOpsSalesPage() {
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
  const [date, setDate] = useState<Date>(new Date())
  const dateStr = format(date, 'yyyy-MM-dd')
  const { data: record, isLoading, error } = useDailySales(branchId ?? '', dateStr)
  const dialog = useDialogState()

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
  const canWrite = canWriteSales(activeBranch?.myRole ?? null)

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title='Sales'
          description='Daily sales, POS report totals, channel and payment method breakdowns, categories, and itemized sales for the selected branch and date.'
          breadcrumbs={[
            { label: 'Restaurant Operations', to: '/app/restaurant' },
            { label: 'Sales' },
          ]}
          actions={
            <Button onClick={dialog.openDialog} disabled={!branchId || !canWrite}>
              {record ? 'Edit Daily Sales' : 'Add Daily Sales'}
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

          <DatePicker selected={date} onSelect={(d) => d && setDate(d)} />
        </div>

        {branches.length === 0 ? (
          <div className='flex h-64 items-center justify-center text-muted-foreground'>
            No branches yet for this restaurant — add one under Restaurant Operations &rarr; Branches
            first.
          </div>
        ) : isLoading ? (
          <div className='flex h-64 items-center justify-center'>Loading sales...</div>
        ) : error ? (
          <div className='flex h-64 items-center justify-center text-destructive'>
            Failed to load sales.
          </div>
        ) : !record ? (
          <div className='flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground'>
            <p>No sales recorded for this branch on {format(date, 'MMM d, yyyy')}.</p>
            {canWrite && <p className='text-sm'>Use &ldquo;Add Daily Sales&rdquo; above to record it.</p>}
          </div>
        ) : (
          <div className='space-y-6'>
            <SalesSummaryCards record={record} />
            <ReconciliationCard reconciliation={record.reconciliation} />
            <SalesDetailTabs record={record} />
          </div>
        )}
      </Main>

      {branchId && restaurantId && (
        <DailySalesDialog
          restaurantId={restaurantId}
          branchId={branchId}
          date={date}
          existingRecord={record}
          open={dialog.open}
          onOpenChange={dialog.setOpen}
        />
      )}
    </>
  )
}

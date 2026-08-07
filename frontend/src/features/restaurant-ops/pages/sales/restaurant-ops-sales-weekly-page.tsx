import { useState } from 'react'
import { differenceInCalendarDays, format, subDays } from 'date-fns'
import { DatePicker } from '@/components/date-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useTenantStore } from '@/stores/tenant-store'
import { useActiveTenant } from '../../hooks/use-active-tenant'
import { useSalesComparison, useWeeklySalesSummary } from '../../hooks/use-sales'
import { ChannelPerformanceSection } from './components/channel-performance-section'
import { PosSourcePerformanceSection } from './components/pos-source-performance-section'
import { ReconciliationCard } from './components/reconciliation-card'
import { SalesComparisonSection } from './components/sales-comparison-section'
import { SalesCoverageCard } from './components/sales-coverage-card'
import { SalesTrendChart } from './components/sales-trend-chart'

const TOP_ITEMS_DISPLAY_LIMIT = 5

function ListCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        {rows.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No data for this range.</p>
        ) : (
          rows.map((row) => (
            <div key={row.label} className='flex items-center justify-between text-sm'>
              <span>{row.label}</span>
              <span className='font-medium'>{row.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// A management reporting foundation — KPIs, a data-coverage card (missing
// days are never shown as zero), a reconciliation card (independent figures
// are surfaced, never auto-adjusted), a daily trend chart, channel
// performance, and an explicit two-range comparison. Not the final
// AI-generated dashboard — every figure here is computed on read from
// DailySalesRecord/entry rows, nothing is stored.
export function RestaurantOpsSalesWeeklyPage() {
  const can = useCan()
  const { restaurantId, restaurants, branchId, branches, isLoading: isTenantLoading } = useActiveTenant()
  const setActiveRestaurant = useTenantStore((state) => state.tenant.setActiveRestaurant)
  const setActiveBranch = useTenantStore((state) => state.tenant.setActiveBranch)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 6))
  const [endDate, setEndDate] = useState<Date>(new Date())

  const rangeLengthDays = differenceInCalendarDays(endDate, startDate) + 1
  const [previousStartDate, setPreviousStartDate] = useState<Date>(subDays(startDate, rangeLengthDays))
  const [previousEndDate, setPreviousEndDate] = useState<Date>(subDays(startDate, 1))

  const { data: summary, isLoading, error } = useWeeklySalesSummary(
    branchId ?? '',
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  )

  const {
    data: comparison,
    isLoading: isComparisonLoading,
    error: comparisonError,
  } = useSalesComparison(
    branchId ?? '',
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd'),
    format(previousStartDate, 'yyyy-MM-dd'),
    format(previousEndDate, 'yyyy-MM-dd')
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
    <Main className='space-y-6'>
      <PageHeader
        title='Weekly Sales'
        description='Sales aggregated across a date range for the selected branch — daily totals, channels, categories, top items, payment methods, discounts, vouchers, coverage, and reconciliation.'
        breadcrumbs={[
          { label: 'Restaurant Operations', to: '/app/restaurant' },
          { label: 'Weekly Sales' },
        ]}
      />

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
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

        <div className='flex items-center gap-2'>
          <DatePicker selected={startDate} onSelect={(d) => d && setStartDate(d)} placeholder='Start date' />
          <span className='text-sm text-muted-foreground'>to</span>
          <DatePicker selected={endDate} onSelect={(d) => d && setEndDate(d)} placeholder='End date' />
        </div>
      </div>

      {branches.length === 0 ? (
        <div className='flex h-64 items-center justify-center text-muted-foreground'>
          No branches yet for this restaurant — add one under Restaurant Operations &rarr; Branches first.
        </div>
      ) : isLoading ? (
        <div className='flex h-64 items-center justify-center'>Loading weekly summary...</div>
      ) : error ? (
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load weekly summary.
        </div>
      ) : !summary ? null : (
        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-bold'>&euro;{summary.totalSales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-bold'>&euro;{summary.discountsTotal}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>Vouchers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-bold'>&euro;{summary.vouchersAmount}</p>
                <p className='text-xs text-muted-foreground'>{summary.vouchersCount} vouchers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>Avg / Recorded Day</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-bold'>
                  {summary.coverage.averageSalesPerRecordedDay !== null
                    ? `€${summary.coverage.averageSalesPerRecordedDay}`
                    : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            <SalesCoverageCard coverage={summary.coverage} />
            <ReconciliationCard reconciliation={summary.reconciliation} />
          </div>

          <SalesTrendChart dailySales={summary.dailySales} />

          <ChannelPerformanceSection channelTotals={summary.channelTotals} />

          <PosSourcePerformanceSection
            posSourceTotals={summary.posSourceTotals}
            channelsByPosSource={summary.channelsByPosSource}
          />

          <div className='grid gap-4 lg:grid-cols-2'>
            <ListCard
              title='Top Items'
              rows={summary.topItems.slice(0, TOP_ITEMS_DISPLAY_LIMIT).map((item) => ({
                label: `${item.itemName} (${item.quantity})`,
                value: `€${item.amount}`,
              }))}
            />
            <ListCard
              title='Categories'
              rows={summary.categoryTotals.map((category) => ({
                label: category.categoryName,
                value:
                  category.percentOfCategoryEntriesTotal !== null
                    ? `€${category.amount} (${category.percentOfCategoryEntriesTotal}%)`
                    : `€${category.amount}`,
              }))}
            />
            <ListCard
              title='Payment Methods'
              rows={summary.paymentMethodTotals.map((method) => ({
                label: method.paymentMethodName,
                value:
                  method.percentOfPaymentMethodEntriesTotal !== null
                    ? `€${method.amount} (${method.percentOfPaymentMethodEntriesTotal}%)`
                    : `€${method.amount}`,
              }))}
            />
          </div>

          <div className='space-y-3'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <h2 className='text-base font-semibold'>Compare to a Previous Period</h2>
              <div className='flex items-center gap-2'>
                <DatePicker
                  selected={previousStartDate}
                  onSelect={(d) => d && setPreviousStartDate(d)}
                  placeholder='Previous start date'
                />
                <span className='text-sm text-muted-foreground'>to</span>
                <DatePicker
                  selected={previousEndDate}
                  onSelect={(d) => d && setPreviousEndDate(d)}
                  placeholder='Previous end date'
                />
              </div>
            </div>

            {isComparisonLoading ? (
              <div className='flex h-32 items-center justify-center'>Loading comparison...</div>
            ) : comparisonError ? (
              <div className='flex h-32 items-center justify-center text-destructive'>
                Failed to load comparison.
              </div>
            ) : comparison ? (
              <SalesComparisonSection comparison={comparison} />
            ) : null}
          </div>
        </div>
      )}
    </Main>
  )
}

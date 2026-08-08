import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  cashReconciliationStatusBadgeClassName,
  cashReconciliationStatusIcon,
  cashReconciliationStatusLabel,
} from '../../../lib/status-labels'
import type { CashReconciliationSummary, DailySalesTotal } from '../../../types/restaurant-ops'

type WeeklyCashReconciliationSectionProps = {
  dailySales: DailySalesTotal[]
  summary: CashReconciliationSummary
}

// ADR-0043 §12 — day-by-day cash reconciliation monitoring, extending the
// existing per-day dailySales[] data (previously only rendered as a chart,
// see SalesTrendChart) into a table the manager/accountant can scan for
// short/over days across the range. Same "surface it, never hide behind
// one number" posture as the rest of Sales reporting.
export function WeeklyCashReconciliationSection({
  dailySales,
  summary,
}: WeeklyCashReconciliationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Cash Reconciliation by Day</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          <SummaryStat label='Total Discounts' value={`€${summary.totalManualDiscounts}`} />
          <SummaryStat label='Total Expected Cash' value={`€${summary.totalExpectedCash}`} />
          <SummaryStat
            label='Total Actual Cash'
            value={summary.daysCounted > 0 ? `€${summary.totalActualCashCounted}` : '—'}
          />
          <SummaryStat
            label='Cumulative Discrepancy'
            value={summary.daysCounted > 0 ? `€${summary.totalDiscrepancy}` : '—'}
          />
          <SummaryStat
            label='Balanced / Short / Over'
            value={`${summary.daysBalanced} / ${summary.daysShort} / ${summary.daysOver}`}
          />
          <SummaryStat label='Not Counted' value={String(summary.daysNotCounted)} />
        </div>

        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className='text-right'>Total Sales</TableHead>
                <TableHead className='text-right'>Discounts</TableHead>
                <TableHead className='text-right'>Expected Cash</TableHead>
                <TableHead className='text-right'>Actual Cash</TableHead>
                <TableHead className='text-right'>Discrepancy</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailySales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center text-sm text-muted-foreground'>
                    No sales recorded for this range.
                  </TableCell>
                </TableRow>
              ) : (
                dailySales.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{format(new Date(`${day.date}T00:00:00`), 'MMM d, yyyy')}</TableCell>
                    <TableCell className='text-right'>&euro;{day.totalSales}</TableCell>
                    <TableCell className='text-right'>&euro;{day.discountsTotal}</TableCell>
                    <TableCell className='text-right'>&euro;{day.expectedCash}</TableCell>
                    <TableCell className='text-right'>
                      {day.actualCashCounted !== null ? `€${day.actualCashCounted}` : '—'}
                    </TableCell>
                    <TableCell className='text-right'>
                      {day.discrepancy !== null ? `€${day.discrepancy}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline' className={cashReconciliationStatusBadgeClassName(day.status)}>
                        {cashReconciliationStatusIcon(day.status)} {cashReconciliationStatusLabel(day.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs font-medium text-muted-foreground'>{label}</p>
      <p className='text-base font-semibold'>{value}</p>
    </div>
  )
}

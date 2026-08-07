import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SalesDataCoverage } from '../../../types/restaurant-ops'

interface SalesCoverageCardProps {
  coverage: SalesDataCoverage
}

function formatMissingDate(date: string) {
  return format(new Date(`${date}T00:00:00`), 'EEE, MMM d')
}

// Missing days are never treated as zero — this card exists specifically to
// make a gap in recorded data obvious, separate from the trend chart and
// the top-line KPI totals (spec §G).
export function SalesCoverageCard({ coverage }: SalesCoverageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Data Coverage</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          <div>
            <p className='text-xs text-muted-foreground'>Days in Range</p>
            <p className='text-lg font-semibold'>{coverage.daysInRange}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Days Recorded</p>
            <p className='text-lg font-semibold'>{coverage.daysRecorded}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Missing Days</p>
            <p
              className={
                coverage.missingDays > 0
                  ? 'text-lg font-semibold text-amber-600 dark:text-amber-400'
                  : 'text-lg font-semibold'
              }
            >
              {coverage.missingDays}
            </p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Avg / Recorded Day</p>
            <p className='text-lg font-semibold'>
              {coverage.averageSalesPerRecordedDay !== null ? `€${coverage.averageSalesPerRecordedDay}` : '—'}
            </p>
          </div>
        </div>
        {coverage.missingDays > 0 && (
          <p className='text-sm text-muted-foreground'>
            Missing: {coverage.missingDates.map(formatMissingDate).join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

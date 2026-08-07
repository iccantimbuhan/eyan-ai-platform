import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SalesReconciliation } from '../../../types/restaurant-ops'

interface ReconciliationCardProps {
  reconciliation: SalesReconciliation
}

// Surfaces the gap between independently-entered figures without implying
// an error — the underlying records are never adjusted based on this card.
// A difference may have a legitimate explanation (ADR-0039 Decision 2/3,
// spec §F) — labeled neutrally as "requires review", not as a fault.
export function ReconciliationCard({ reconciliation }: ReconciliationCardProps) {
  const hasPosVariance =
    reconciliation.varianceVsPosReportedTotal !== null && Number(reconciliation.varianceVsPosReportedTotal) !== 0
  const hasChannelVariance = Number(reconciliation.varianceVsChannelEntriesTotal) !== 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Data Reconciliation</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 text-sm'>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground'>Reported Total Sales</span>
          <span className='font-medium'>&euro;{reconciliation.totalSales}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground'>
            POS Reported Total{reconciliation.posReportedRecordCount > 1 ? ` (${reconciliation.posReportedRecordCount} days)` : ''}
          </span>
          <span className='font-medium'>
            {reconciliation.posReportedTotal !== null ? `€${reconciliation.posReportedTotal}` : '—'}
          </span>
        </div>
        {reconciliation.posReportedTotal !== null && (
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Recorded difference vs POS</span>
            <span className='flex items-center gap-2 font-medium'>
              &euro;{reconciliation.varianceVsPosReportedTotal}
              {hasPosVariance && <Badge variant='outline'>Requires review</Badge>}
            </span>
          </div>
        )}
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground'>Channel Entries Total</span>
          <span className='font-medium'>&euro;{reconciliation.channelEntriesTotal}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground'>Recorded difference vs Channel Entries</span>
          <span className='flex items-center gap-2 font-medium'>
            &euro;{reconciliation.varianceVsChannelEntriesTotal}
            {hasChannelVariance && <Badge variant='outline'>Requires review</Badge>}
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>
          These figures are entered independently and are never automatically reconciled. A difference may have a
          legitimate explanation and does not necessarily indicate an error.
        </p>
      </CardContent>
    </Card>
  )
}

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  cashReconciliationStatusBadgeClassName,
  cashReconciliationStatusIcon,
  cashReconciliationStatusLabel,
} from '../../../lib/status-labels'
import type { CashReconciliation, SalesPaymentMethodEntry } from '../../../types/restaurant-ops'

type CashReconciliationCardProps = {
  cashReconciliation: CashReconciliation
  paymentMethods: SalesPaymentMethodEntry[]
}

// ADR-0043 — the main new Daily Sales feature. Deliberately never shows
// Total Sales here (that stays on SalesSummaryCards as the source of
// truth) — this card is entirely about physical cash on hand, walking the
// manager/accountant through Physical Cash Basis -> Manual Discount ->
// Expected Cash -> Actual Cash Counted -> Discrepancy so the calculation is
// never hidden behind a single number.
export function CashReconciliationCard({ cashReconciliation, paymentMethods }: CashReconciliationCardProps) {
  const cashEntries = paymentMethods.filter((entry) => entry.isCashEquivalent)
  const cardEntries = paymentMethods.filter((entry) => !entry.isCashEquivalent)

  return (
    <Card className='border-2'>
      <CardHeader>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <CardTitle>Cash Reconciliation</CardTitle>
          <Badge
            variant='outline'
            className={cashReconciliationStatusBadgeClassName(cashReconciliation.status)}
          >
            {cashReconciliationStatusIcon(cashReconciliation.status)}{' '}
            {cashReconciliationStatusLabel(cashReconciliation.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='space-y-4 text-sm'>
        <div>
          <p className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            Physical Cash Basis
          </p>
          {cashEntries.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              No payment methods are classified as physical cash yet — mark one in the Payment Methods
              section below.
            </p>
          ) : (
            <div className='space-y-1'>
              {cashEntries.map((entry) => (
                <div key={entry.id} className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>
                    {entry.paymentMethodName}
                    {entry.posSourceName ? ` (${entry.posSourceName})` : ''}
                  </span>
                  <span className='font-medium'>&euro;{entry.amount}</span>
                </div>
              ))}
            </div>
          )}
          <div className='mt-2 flex items-center justify-between border-t pt-2 font-semibold'>
            <span>Gross Cash Basis</span>
            <span>&euro;{cashReconciliation.physicalCashBasis}</span>
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground'>Manual Discounts Today</span>
          <span className='font-medium'>&minus;&euro;{cashReconciliation.manualDiscounts}</span>
        </div>

        <div className='flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 font-semibold'>
          <span>Expected Cash</span>
          <span>&euro;{cashReconciliation.expectedCash}</span>
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-muted-foreground'>Actual Cash Counted</span>
          <span className='font-medium'>
            {cashReconciliation.actualCashCounted !== null ? `€${cashReconciliation.actualCashCounted}` : 'Not entered yet'}
          </span>
        </div>

        <div className='flex items-center justify-between border-t pt-3'>
          <span className='font-semibold'>Discrepancy</span>
          <span className='text-lg font-bold'>
            {cashReconciliation.discrepancy !== null ? `€${cashReconciliation.discrepancy}` : '—'}
          </span>
        </div>

        {cardEntries.length > 0 && (
          <div className='space-y-1 border-t pt-3 text-xs text-muted-foreground'>
            <div className='flex items-center justify-between'>
              <span>Card / Electronic (not physical cash)</span>
              <span>&euro;{cashReconciliation.cardElectronicTotal}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span>Total Payment Methods</span>
              <span>&euro;{cashReconciliation.totalPaymentMethods}</span>
            </div>
          </div>
        )}

        <p className='text-xs text-muted-foreground'>
          Total Sales stays the source of truth and is never changed here &mdash; this card only tracks the
          physical cash the manager should have on hand.
        </p>
      </CardContent>
    </Card>
  )
}

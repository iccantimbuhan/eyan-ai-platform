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

const UNASSIGNED_POS_LABEL = 'Not assigned to a POS source'

// Section heading for one POS bucket — only labeled "Discountable" /
// "Non-Discountable" when a discount is actually scoped to a specific POS
// source today (ADR-0043 amendment). When discountPosSourceId is null (the
// legacy/global case, or simply no discount today), every bucket is shown
// neutrally — labeling POS 2 "Non-Discountable" would be misleading when
// nothing anywhere is being discounted.
function bucketHeading(
  posSourceLabel: string,
  isDiscountedBucket: boolean,
  discountPosSourceId: string | null
): string {
  if (discountPosSourceId === null) return `Physical Cash — ${posSourceLabel}`
  return isDiscountedBucket
    ? `Discountable Physical Cash — ${posSourceLabel}`
    : `Non-Discountable Physical Cash — ${posSourceLabel}`
}

// ADR-0043, amended for POS-scoped discounts — the main Daily Sales
// feature. Deliberately never shows Total Sales here (that stays on
// SalesSummaryCards as the source of truth) — this card is entirely about
// physical cash on hand, grouped by POS source so a discount scoped to one
// POS source is never visually (or mathematically) applied to another's
// cash. Walks Gross Cash Basis -> Manual Discount -> Expected Cash per POS
// bucket, then Expected Cash on Hand -> Actual Cash Counted -> Discrepancy
// overall, so the calculation is never hidden behind a single number.
export function CashReconciliationCard({ cashReconciliation, paymentMethods }: CashReconciliationCardProps) {
  const cashEntries = paymentMethods.filter((entry) => entry.isCashEquivalent)
  const cardEntries = paymentMethods.filter((entry) => !entry.isCashEquivalent)
  const hasDiscountToday = Number(cashReconciliation.manualDiscounts) !== 0

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
      <CardContent className='space-y-5 text-sm'>
        {cashReconciliation.cashByPosSource.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No payment methods are classified as physical cash yet — mark one in the Payment Methods
            section below.
          </p>
        ) : (
          cashReconciliation.cashByPosSource.map((bucket) => {
            const isDiscountedBucket =
              cashReconciliation.discountPosSourceId !== null &&
              bucket.posSourceId === cashReconciliation.discountPosSourceId
            const label = bucket.posSourceName ?? UNASSIGNED_POS_LABEL
            const bucketEntries = cashEntries.filter((entry) => entry.posSourceId === bucket.posSourceId)

            return (
              <div key={bucket.posSourceId ?? 'unassigned'}>
                <p className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                  {bucketHeading(label, isDiscountedBucket, cashReconciliation.discountPosSourceId)}
                </p>

                {bucketEntries.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>No cash entries recorded here yet today.</p>
                ) : (
                  <div className='space-y-1'>
                    {bucketEntries.map((entry) => (
                      <div key={entry.id} className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>{entry.paymentMethodName}</span>
                        <span className='font-medium'>&euro;{entry.amount}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className='mt-2 flex items-center justify-between border-t pt-2 font-semibold'>
                  <span>{label} Cash Basis</span>
                  <span>&euro;{bucket.grossCashBasis}</span>
                </div>

                {isDiscountedBucket && (
                  <>
                    <div className='mt-1 flex items-center justify-between'>
                      <span className='text-muted-foreground'>Manual Discounts Today</span>
                      <span className='font-medium'>&minus;&euro;{bucket.discountApplied}</span>
                    </div>
                    <div className='mt-1 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 font-semibold'>
                      <span>{label} Expected Cash</span>
                      <span>&euro;{bucket.expectedCash}</span>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}

        {cashReconciliation.discountPosSourceId === null && hasDiscountToday && (
          <div className='flex items-center justify-between border-t pt-3'>
            <span className='text-muted-foreground'>Manual Discounts Today (all POS sources)</span>
            <span className='font-medium'>&minus;&euro;{cashReconciliation.manualDiscounts}</span>
          </div>
        )}

        <div className='flex items-center justify-between rounded-md bg-muted px-3 py-2 text-base font-bold'>
          <span>Expected Cash on Hand</span>
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

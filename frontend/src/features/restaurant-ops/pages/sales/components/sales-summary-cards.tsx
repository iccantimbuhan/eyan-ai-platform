import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailySalesRecord } from '../../../types/restaurant-ops'

type SalesSummaryCardsProps = {
  record: DailySalesRecord
}

// Channel Sales is the server-computed sum of this day's SalesChannelEntry
// rows (record.reconciliation.channelEntriesTotal) — never assumed to equal
// totalSales/posReportedTotal (ADR-0039 Decision 2). It's shown alongside
// them for a quick glance; the ReconciliationCard below is where the
// variance between these independent figures is actually surfaced.
export function SalesSummaryCards({ record }: SalesSummaryCardsProps) {
  const stats = [
    { label: 'Total Sales', value: record.totalSales },
    { label: 'POS Sales', value: record.posReportedTotal ?? '—' },
    { label: 'Channel Sales', value: record.reconciliation.channelEntriesTotal },
    { label: 'Discounts', value: record.discountsTotal },
    { label: 'Vouchers', value: record.vouchersAmount },
  ]

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>{stat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold'>&euro;{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

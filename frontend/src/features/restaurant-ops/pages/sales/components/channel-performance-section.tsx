import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ChannelTotal } from '../../../types/restaurant-ops'

interface ChannelPerformanceSectionProps {
  channelTotals: ChannelTotal[]
}

// Deliberately neutral wording ("highest recorded sales" / "highest average
// sales/day") rather than "best channel" — delivery platforms may differ in
// pricing, commissions, discounts, or order volume, so gross sales alone
// doesn't establish which is actually most profitable (spec §E).
export function ChannelPerformanceSection({ channelTotals }: ChannelPerformanceSectionProps) {
  if (channelTotals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>No channel sales recorded for this range.</p>
        </CardContent>
      </Card>
    )
  }

  const sorted = [...channelTotals].sort((a, b) => Number(b.amount) - Number(a.amount))
  const highestSalesId = sorted[0]?.salesChannelId

  const withAverage = channelTotals.filter((c) => c.averageAmountPerActiveDay !== null)
  const highestAverageId =
    withAverage.length > 0
      ? [...withAverage].sort(
          (a, b) => Number(b.averageAmountPerActiveDay) - Number(a.averageAmountPerActiveDay)
        )[0].salesChannelId
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className='text-right'>Sales</TableHead>
                <TableHead className='text-right'>% of Channel Sales</TableHead>
                <TableHead className='text-right'>Active Days</TableHead>
                <TableHead className='text-right'>Avg / Active Day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((channel) => (
                <TableRow key={channel.salesChannelId}>
                  <TableCell>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span>{channel.channelName}</span>
                      {channel.salesChannelId === highestSalesId && (
                        <Badge variant='outline'>Highest recorded sales</Badge>
                      )}
                      {channel.salesChannelId === highestAverageId && (
                        <Badge variant='outline'>Highest average sales/day</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>&euro;{channel.amount}</TableCell>
                  <TableCell className='text-right'>
                    {channel.percentOfChannelEntriesTotal !== null ? `${channel.percentOfChannelEntriesTotal}%` : '—'}
                  </TableCell>
                  <TableCell className='text-right'>{channel.activeDays}</TableCell>
                  <TableCell className='text-right'>
                    {channel.averageAmountPerActiveDay !== null ? `€${channel.averageAmountPerActiveDay}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

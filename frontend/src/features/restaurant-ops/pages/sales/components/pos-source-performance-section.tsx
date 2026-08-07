import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PosSourceChannelBreakdown, PosSourceTotal } from '../../../types/restaurant-ops'

interface PosSourcePerformanceSectionProps {
  posSourceTotals: PosSourceTotal[]
  channelsByPosSource: PosSourceChannelBreakdown[]
}

const UNASSIGNED_LABEL = 'Not assigned to a POS source'

// POS Source / Sales Channel Flexibility — answers "sales by POS source"
// and "sales by POS + channel combination". Rendered only when at least
// one channel entry has actually been tagged with a real POS source — a
// restaurant that only ever runs one POS (never touches the optional POS
// Source field) sees nothing new here; its figures are already covered by
// Channel Performance above.
export function PosSourcePerformanceSection({
  posSourceTotals,
  channelsByPosSource,
}: PosSourcePerformanceSectionProps) {
  const hasAnyPosSourceAssigned = posSourceTotals.some((p) => p.posSourceId !== null)
  if (!hasAnyPosSourceAssigned) return null

  const sortedTotals = [...posSourceTotals].sort((a, b) => Number(b.amount) - Number(a.amount))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by POS Source</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>POS Source</TableHead>
                <TableHead className='text-right'>Sales</TableHead>
                <TableHead className='text-right'>% of Channel Sales</TableHead>
                <TableHead className='text-right'>Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTotals.map((posSource) => (
                <TableRow key={posSource.posSourceId ?? 'unassigned'}>
                  <TableCell>{posSource.posSourceName ?? UNASSIGNED_LABEL}</TableCell>
                  <TableCell className='text-right'>&euro;{posSource.amount}</TableCell>
                  <TableCell className='text-right'>
                    {posSource.percentOfChannelEntriesTotal !== null
                      ? `${posSource.percentOfChannelEntriesTotal}%`
                      : '—'}
                  </TableCell>
                  <TableCell className='text-right'>{posSource.transactionCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className='space-y-4'>
          <p className='text-sm font-medium'>By POS Source + Channel</p>
          {channelsByPosSource.map((bucket) => (
            <div key={bucket.posSourceId ?? 'unassigned'} className='space-y-2'>
              <p className='text-sm text-muted-foreground'>{bucket.posSourceName ?? UNASSIGNED_LABEL}</p>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className='text-right'>Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bucket.channels.map((channel) => (
                      <TableRow key={channel.salesChannelId}>
                        <TableCell>{channel.channelName}</TableCell>
                        <TableCell className='text-right'>&euro;{channel.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

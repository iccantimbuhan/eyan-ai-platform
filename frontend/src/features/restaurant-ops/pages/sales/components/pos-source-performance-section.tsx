import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type {
  PaymentMethodPosSourceTotal,
  PosSourceChannelBreakdown,
  PosSourcePaymentMethodBreakdown,
  PosSourceTotal,
} from '../../../types/restaurant-ops'

interface PosSourcePerformanceSectionProps {
  posSourceTotals: PosSourceTotal[]
  channelsByPosSource: PosSourceChannelBreakdown[]
  paymentMethodPosSourceTotals: PaymentMethodPosSourceTotal[]
  paymentMethodsByPosSource: PosSourcePaymentMethodBreakdown[]
}

const UNASSIGNED_LABEL = 'Not assigned to a POS source'

// POS Source / Sales Channel Flexibility — answers "sales by POS source"
// and "sales by POS + channel/payment-method combination" for both
// dimensions independently (a channel and a payment method are never
// merged into one combined POS figure — see ADR-0042). Each dimension's
// block is rendered only when at least one entry of THAT dimension has
// actually been tagged with a real POS source — a restaurant that only
// ever runs one POS (never touches the optional POS Source field on
// either Channels or Payment Methods) sees nothing new here.
export function PosSourcePerformanceSection({
  posSourceTotals,
  channelsByPosSource,
  paymentMethodPosSourceTotals,
  paymentMethodsByPosSource,
}: PosSourcePerformanceSectionProps) {
  const channelPosSourceUsed = posSourceTotals.some((p) => p.posSourceId !== null)
  const paymentMethodPosSourceUsed = paymentMethodPosSourceTotals.some((p) => p.posSourceId !== null)
  if (!channelPosSourceUsed && !paymentMethodPosSourceUsed) return null

  const sortedChannelTotals = [...posSourceTotals].sort((a, b) => Number(b.amount) - Number(a.amount))
  const sortedPaymentMethodTotals = [...paymentMethodPosSourceTotals].sort(
    (a, b) => Number(b.amount) - Number(a.amount)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by POS Source</CardTitle>
      </CardHeader>
      <CardContent className='space-y-8'>
        {channelPosSourceUsed && (
          <div className='space-y-6'>
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
                  {sortedChannelTotals.map((posSource) => (
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
          </div>
        )}

        {paymentMethodPosSourceUsed && (
          <div className='space-y-6'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>POS Source</TableHead>
                    <TableHead className='text-right'>Payment Method Sales</TableHead>
                    <TableHead className='text-right'>% of Payment Method Sales</TableHead>
                    <TableHead className='text-right'>Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPaymentMethodTotals.map((posSource) => (
                    <TableRow key={posSource.posSourceId ?? 'unassigned'}>
                      <TableCell>{posSource.posSourceName ?? UNASSIGNED_LABEL}</TableCell>
                      <TableCell className='text-right'>&euro;{posSource.amount}</TableCell>
                      <TableCell className='text-right'>
                        {posSource.percentOfPaymentMethodEntriesTotal !== null
                          ? `${posSource.percentOfPaymentMethodEntriesTotal}%`
                          : '—'}
                      </TableCell>
                      <TableCell className='text-right'>{posSource.transactionCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className='space-y-4'>
              <p className='text-sm font-medium'>By POS Source + Payment Method</p>
              {paymentMethodsByPosSource.map((bucket) => (
                <div key={bucket.posSourceId ?? 'unassigned'} className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>{bucket.posSourceName ?? UNASSIGNED_LABEL}</p>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Method</TableHead>
                          <TableHead className='text-right'>Sales</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bucket.paymentMethods.map((method) => (
                          <TableRow key={method.salesPaymentMethodId}>
                            <TableCell>{method.paymentMethodName}</TableCell>
                            <TableCell className='text-right'>&euro;{method.amount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

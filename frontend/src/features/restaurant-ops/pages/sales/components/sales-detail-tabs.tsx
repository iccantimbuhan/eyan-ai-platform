import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DailySalesRecord } from '../../../types/restaurant-ops'

type SalesDetailTabsProps = {
  record: DailySalesRecord
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className='h-20 text-center text-muted-foreground'>
        {message}
      </TableCell>
    </TableRow>
  )
}

// Read-only breakdown of one day's already-recorded sales — the four
// sections the spec calls for (Channels/Payment Methods/Categories/Items).
// Editing/adding lines happens through the Add/Edit Daily Sales dialog.
export function SalesDetailTabs({ record }: SalesDetailTabsProps) {
  return (
    <Tabs defaultValue='channels'>
      <TabsList>
        <TabsTrigger value='channels'>Sales by Channel</TabsTrigger>
        <TabsTrigger value='payment-methods'>Payment Methods</TabsTrigger>
        <TabsTrigger value='categories'>Categories</TabsTrigger>
        <TabsTrigger value='items'>Itemized Sales</TabsTrigger>
      </TabsList>

      <TabsContent value='channels'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead className='text-right'>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {record.channels.length === 0 ? (
              <EmptyRow colSpan={2} message='No channel entries recorded for this day.' />
            ) : (
              record.channels.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.channelName}</TableCell>
                  <TableCell className='text-right'>&euro;{entry.amount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value='payment-methods'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment Method</TableHead>
              <TableHead className='text-right'>Transactions</TableHead>
              <TableHead className='text-right'>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {record.paymentMethods.length === 0 ? (
              <EmptyRow colSpan={3} message='No payment method entries recorded for this day.' />
            ) : (
              record.paymentMethods.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.paymentMethodName}</TableCell>
                  <TableCell className='text-right'>{entry.transactionCount ?? '—'}</TableCell>
                  <TableCell className='text-right'>&euro;{entry.amount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value='categories'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className='text-right'>Quantity</TableHead>
              <TableHead className='text-right'>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {record.categories.length === 0 ? (
              <EmptyRow colSpan={3} message='No category entries recorded for this day.' />
            ) : (
              record.categories.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.categoryName}</TableCell>
                  <TableCell className='text-right'>{entry.quantity ?? '—'}</TableCell>
                  <TableCell className='text-right'>&euro;{entry.amount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value='items'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className='text-right'>Quantity</TableHead>
              <TableHead className='text-right'>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {record.items.length === 0 ? (
              <EmptyRow colSpan={4} message='No itemized sales recorded for this day.' />
            ) : (
              record.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.itemName}</TableCell>
                  <TableCell>{entry.categoryName ?? '—'}</TableCell>
                  <TableCell className='text-right'>{entry.quantity}</TableCell>
                  <TableCell className='text-right'>&euro;{entry.amount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  )
}

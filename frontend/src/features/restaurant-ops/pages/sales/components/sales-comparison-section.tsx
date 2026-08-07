import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SalesComparison, SalesComparisonEntry } from '../../../types/restaurant-ops'

interface SalesComparisonSectionProps {
  comparison: SalesComparison
}

function changeColorClass(changeValue: number): string {
  if (changeValue > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (changeValue < 0) return 'text-red-600 dark:text-red-400'
  return ''
}

function formatChangePercent(entry: SalesComparisonEntry): string {
  if (entry.changePercent === null) return 'No comparison data'
  const changeValue = Number(entry.change)
  return `${changeValue > 0 ? '+' : ''}${entry.changePercent}%`
}

function ComparisonTable({
  columnLabel,
  entries,
}: {
  columnLabel: string
  entries: SalesComparisonEntry[]
}) {
  if (entries.length === 0) {
    return <p className='text-sm text-muted-foreground'>No data for either period.</p>
  }

  return (
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columnLabel}</TableHead>
            <TableHead className='text-right'>Current</TableHead>
            <TableHead className='text-right'>Previous</TableHead>
            <TableHead className='text-right'>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const changeValue = Number(entry.change)
            return (
              <TableRow key={entry.key}>
                <TableCell>{entry.label}</TableCell>
                <TableCell className='text-right'>&euro;{entry.current}</TableCell>
                <TableCell className='text-right'>&euro;{entry.previous}</TableCell>
                <TableCell className='text-right'>
                  <div className={changeColorClass(changeValue)}>
                    {changeValue > 0 ? '+' : ''}&euro;{entry.change}
                  </div>
                  <div className='text-xs text-muted-foreground'>{formatChangePercent(entry)}</div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// Both periods (current + previous) come from the caller — this component
// never infers or assumes what "previous" means, it only renders the two
// explicit ranges it was given (spec §C). changePercent is rendered as "No
// comparison data" rather than an invalid/infinite percentage whenever the
// previous period had no recorded value for that metric.
export function SalesComparisonSection({ comparison }: SalesComparisonSectionProps) {
  const total = comparison.totalSalesComparison
  const totalChangeValue = Number(total.change)

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Total Sales Comparison</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-wrap items-baseline gap-6'>
          <div>
            <p className='text-xs text-muted-foreground'>Current Period</p>
            <p className='text-2xl font-bold'>&euro;{total.current}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Previous Period</p>
            <p className='text-2xl font-bold'>&euro;{total.previous}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Change</p>
            <p className={`text-2xl font-bold ${changeColorClass(totalChangeValue)}`}>
              {totalChangeValue > 0 ? '+' : ''}&euro;{total.change}
            </p>
            <p className='text-sm text-muted-foreground'>{formatChangePercent(total)}</p>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Channel Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonTable columnLabel='Channel' entries={comparison.channelComparison} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Category Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonTable columnLabel='Category' entries={comparison.categoryComparison} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Top Items Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonTable columnLabel='Item' entries={comparison.topItemsComparison} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

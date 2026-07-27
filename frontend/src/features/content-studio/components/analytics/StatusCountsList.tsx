import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface StatusCountsListProps {
  title: string
  counts: { status: string; count: number }[]
  statusLabel: (status: string) => string
  statusVariant: (status: string) => BadgeVariant
  emptyMessage: string
}

// A small, fixed set of named statuses (3-6 typically) is clearer as a
// labeled count list than as a bar chart requiring a legend to decode —
// per the "sometimes the answer isn't a chart" form heuristic. Reuses this
// app's existing Badge variants (the same ones AssetStatusBadge already
// uses) rather than inventing a new status color palette.
export function StatusCountsList({
  title,
  counts,
  statusLabel,
  statusVariant,
  emptyMessage,
}: StatusCountsListProps) {
  const nonZero = counts.filter((entry) => entry.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {nonZero.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
        ) : (
          <ul className='space-y-2'>
            {nonZero.map((entry) => (
              <li key={entry.status} className='flex items-center justify-between text-sm'>
                <Badge variant={statusVariant(entry.status)}>{statusLabel(entry.status)}</Badge>
                <span className='font-medium'>{entry.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

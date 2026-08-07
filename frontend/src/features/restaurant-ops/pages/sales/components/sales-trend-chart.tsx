import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailySalesTotal } from '../../../types/restaurant-ops'

interface SalesTrendChartProps {
  dailySales: DailySalesTotal[]
}

function dayLabel(date: string) {
  return format(new Date(`${date}T00:00:00`), 'EEE d')
}

interface TrendPoint {
  date: string
  label: string
  totalSales: number
}

interface TooltipPayloadEntry {
  payload: TrendPoint
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null

  const entry = payload[0].payload

  return (
    <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm'>
      <p className='font-medium'>{format(new Date(`${entry.date}T00:00:00`), 'EEEE, MMM d')}</p>
      <p>&euro;{entry.totalSales.toFixed(2)}</p>
    </div>
  )
}

// Only recorded days are plotted — a missing day has no bar at all, never a
// zero-height bar, so it can never be visually confused with a real €0
// sales day. Coverage/missing-day detail lives in its own card, not here
// (spec §D/§G).
export function SalesTrendChart({ dailySales }: SalesTrendChartProps) {
  if (dailySales.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>No sales recorded for this range.</p>
        </CardContent>
      </Card>
    )
  }

  const data: TrendPoint[] = dailySales.map((day) => ({
    date: day.date,
    label: dayLabel(day.date),
    totalSales: Number(day.totalSales),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Day</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-64 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} className='stroke-border' />
              <XAxis dataKey='label' tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--muted)' }} />
              <Bar dataKey='totalSales' name='Total Sales' fill='var(--chart-1)' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

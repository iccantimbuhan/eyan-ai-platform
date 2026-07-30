import { format } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '../../../lib/format-currency'
import type { SpendingTrendPoint } from '../../../types/finance'

interface SpendingTrendChartProps {
  spendingTrend: SpendingTrendPoint[]
}

function monthLabel(period: string): string {
  return format(new Date(`${period}-01T00:00:00`), 'MMM')
}

interface TooltipPayloadEntry {
  payload: { period: string; total: number }
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null

  const entry = payload[0].payload

  return (
    <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm'>
      <p className='font-medium'>{monthLabel(entry.period)}</p>
      <p>{formatCurrency(entry.total)}</p>
    </div>
  )
}

// One series (total spend per month) — a single consistent line color, same
// reasoning as the existing Bar charts' single-series convention.
export function SpendingTrendChart({ spendingTrend }: SpendingTrendChartProps) {
  const hasSpending = spendingTrend.some((point) => Number(point.total) > 0)

  if (!hasSpending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>No expenses yet.</p>
        </CardContent>
      </Card>
    )
  }

  const data = spendingTrend.map((point) => ({
    period: point.period,
    label: monthLabel(point.period),
    total: Number(point.total),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-64 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} className='stroke-border' />
              <XAxis
                dataKey='label'
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--border)' }} />
              <Line
                type='monotone'
                dataKey='total'
                name='Spending'
                stroke='var(--chart-1)'
                strokeWidth={2}
                dot={{ r: 4, fill: 'var(--chart-1)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

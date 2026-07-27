import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { formatDurationMs } from '@/lib/utils'
import type { ProviderUsage } from '../../types/analytics'

interface ProviderUsageChartProps {
  providerUsage: ProviderUsage[]
}

interface TooltipPayloadEntry {
  payload: { provider: string; count: number; avgGenerationTimeMs: number | null }
}

function UsageTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null

  const entry = payload[0].payload

  return (
    <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm'>
      <p className='font-medium'>{entry.provider}</p>
      <p>{entry.count} generation(s)</p>
      <p>Avg duration: {formatDurationMs(entry.avgGenerationTimeMs)}</p>
    </div>
  )
}

// One series (generation count) across providers — a single consistent bar
// color, same reasoning as AssetCountsChart. Average generation duration is
// a second measure of a different scale, so it's surfaced in the tooltip
// only, never as a second y-axis (no dual-axis charts).
export function ProviderUsageChart({ providerUsage }: ProviderUsageChartProps) {
  if (providerUsage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>No generations yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-64 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={providerUsage} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} className='stroke-border' />
              <XAxis
                dataKey='provider'
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<UsageTooltip />} cursor={{ fill: 'var(--muted)' }} />
              <Bar dataKey='count' name='Generations' fill='var(--chart-2)' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

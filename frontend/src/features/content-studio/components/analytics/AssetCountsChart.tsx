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

import { ASSET_TYPE_OPTIONS } from '../../types/asset'
import type { AssetTypeCount } from '../../types/analytics'

interface AssetCountsChartProps {
  assetCounts: AssetTypeCount[]
}

function assetTypeLabel(assetType: string): string {
  return ASSET_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ?? assetType
}

// One series (asset count) across categories — a magnitude comparison, not
// an identity comparison, so every bar is one consistent color (this app's
// existing --chart-1 token) rather than one hue per category.
export function AssetCountsChart({ assetCounts }: AssetCountsChartProps) {
  if (assetCounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assets by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>No assets yet.</p>
        </CardContent>
      </Card>
    )
  }

  const data = assetCounts.map((entry) => ({
    label: assetTypeLabel(entry.assetType),
    count: entry.count,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-64 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} className='stroke-border' />
              <XAxis
                dataKey='label'
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'var(--muted)' }}
                contentStyle={{
                  backgroundColor: 'var(--popover)',
                  color: 'var(--popover-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey='count' name='Assets' fill='var(--chart-1)' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

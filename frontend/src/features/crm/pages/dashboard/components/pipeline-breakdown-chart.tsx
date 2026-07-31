import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { statusLabel } from '../../../lib/lead-lifecycle'
import type { LeadStatus } from '../../../types/crm'

interface PipelineBreakdownChartProps {
  statusCounts: { status: LeadStatus; count: number }[]
}

// Same fixed --chart-N token order and single-slice donut workaround as
// Finance's category-breakdown-chart.tsx (recharts collapses a 100% pie
// slice to nothing — see that file's comment) — reused verbatim rather than
// re-solving the same bug here.
const SLICE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
const OTHER_COLOR = 'var(--muted-foreground)'
const MAX_DIRECT_SLICES = 5

interface TooltipPayloadEntry {
  payload: { label: string; value: number }
}

function BreakdownTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null

  const entry = payload[0].payload

  return (
    <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm'>
      <p className='font-medium'>{entry.label}</p>
      <p>{entry.value} lead{entry.value === 1 ? '' : 's'}</p>
    </div>
  )
}

function SingleStatusDonut({ label, color }: { label: string; color: string }) {
  return (
    <div className='flex h-64 w-full flex-col items-center justify-center gap-4'>
      <svg width={160} height={160} viewBox='0 0 160 160'>
        <circle cx={80} cy={80} r={64} fill={color} />
        <circle cx={80} cy={80} r={35.2} fill='var(--card)' />
      </svg>
      <div className='flex items-center gap-2 text-xs'>
        <span className='h-2.5 w-2.5 rounded-sm' style={{ backgroundColor: color }} />
        <span className='text-muted-foreground'>{label}</span>
      </div>
    </div>
  )
}

export function PipelineBreakdownChart({ statusCounts }: PipelineBreakdownChartProps) {
  const nonZero = statusCounts.filter((entry) => entry.count > 0)

  if (nonZero.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>No leads yet.</p>
        </CardContent>
      </Card>
    )
  }

  const sorted = [...nonZero].sort((a, b) => b.count - a.count)
  const top = sorted.slice(0, MAX_DIRECT_SLICES)
  const rest = sorted.slice(MAX_DIRECT_SLICES)

  const data = top.map((entry) => ({ label: statusLabel(entry.status), value: entry.count }))

  if (rest.length > 0) {
    data.push({ label: 'Other', value: rest.reduce((sum, entry) => sum + entry.count, 0) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Status</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 1 ? (
          <SingleStatusDonut label={data[0].label} color={SLICE_COLORS[0]} />
        ) : (
          <div className='h-64 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={data}
                  dataKey='value'
                  nameKey='label'
                  innerRadius='55%'
                  outerRadius='80%'
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.label}
                      fill={index < top.length ? SLICE_COLORS[index] : OTHER_COLOR}
                    />
                  ))}
                </Pie>
                <Tooltip content={<BreakdownTooltip />} />
                <Legend verticalAlign='bottom' height={36} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { categoryLabel } from '../../../lib/category-labels'
import { formatCurrency } from '../../../lib/format-currency'
import type { CategoryBreakdown } from '../../../types/finance'

interface CategoryBreakdownChartProps {
  categoryBreakdown: CategoryBreakdown[]
}

// Fixed categorical order — never cycled — matching this app's five
// --chart-N tokens. A held-out "Other" slice (a neutral, not a 6th hue)
// absorbs anything past the top 5 categories rather than generating a new
// color, per this app's existing chart color convention.
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
      <p>{formatCurrency(entry.value)}</p>
    </div>
  )
}

// A single category is 100% of the total, i.e. a full 360deg sweep. Recharts'
// arc math collapses start/end angle to a degenerate (near-zero-length) SVG
// path in that exact case and silently renders nothing — confirmed by
// inspecting the rendered <path>'s `d` attribute. A plain two-circle donut
// (no arc math at all) sidesteps the bug entirely and looks identical for
// the one case where it applies.
function SingleCategoryDonut({ label, color }: { label: string; color: string }) {
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

export function CategoryBreakdownChart({ categoryBreakdown }: CategoryBreakdownChartProps) {
  if (categoryBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>No expenses yet.</p>
        </CardContent>
      </Card>
    )
  }

  const sorted = [...categoryBreakdown].sort((a, b) => Number(b.total) - Number(a.total))
  const top = sorted.slice(0, MAX_DIRECT_SLICES)
  const rest = sorted.slice(MAX_DIRECT_SLICES)

  const data = top.map((entry) => ({
    label: categoryLabel(entry.category),
    value: Number(entry.total),
  }))

  if (rest.length > 0) {
    data.push({
      label: 'Other',
      value: rest.reduce((sum, entry) => sum + Number(entry.total), 0),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 1 ? (
          <SingleCategoryDonut label={data[0].label} color={SLICE_COLORS[0]} />
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
                <Legend
                  verticalAlign='bottom'
                  height={36}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

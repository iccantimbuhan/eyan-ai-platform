import { StatCard } from '@/features/dashboard/components/stat-card'
import { formatDurationMs } from '@/lib/utils'

import type { PerformanceMetric } from '../../types/analytics'

interface PerformanceStatsProps {
  reviewPerformance: PerformanceMetric
  publishingPerformance: PerformanceMetric
}

function sampleDescription(sampleSize: number): string {
  if (sampleSize === 0) return 'No completions yet'
  return `Based on ${sampleSize} completion${sampleSize === 1 ? '' : 's'}`
}

// A single headline number per metric, not a chart — per the "sometimes
// the answer isn't a chart" form heuristic. Reuses the existing, generic
// StatCard from the platform dashboard rather than a new tile component.
export function PerformanceStats({
  reviewPerformance,
  publishingPerformance,
}: PerformanceStatsProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <StatCard
        title='Avg. Review Time'
        value={formatDurationMs(reviewPerformance.avgDurationMs)}
        description={sampleDescription(reviewPerformance.sampleSize)}
      />
      <StatCard
        title='Avg. Publishing Time'
        value={formatDurationMs(publishingPerformance.avgDurationMs)}
        description={sampleDescription(publishingPerformance.sampleSize)}
      />
    </div>
  )
}

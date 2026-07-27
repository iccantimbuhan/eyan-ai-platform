import { REVIEW_STATUS_OPTIONS } from '../../types/asset'
import { PUBLISHING_STATUS_OPTIONS } from '../../types/publishing'
import type { ProjectAnalyticsSummary } from '../../types/analytics'
import { AssetCountsChart } from './AssetCountsChart'
import { PerformanceStats } from './PerformanceStats'
import { ProviderUsageChart } from './ProviderUsageChart'
import { StatusCountsList } from './StatusCountsList'

interface AnalyticsSummaryProps {
  summary: ProjectAnalyticsSummary
}

function reviewStatusLabel(status: string): string {
  return REVIEW_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

function reviewStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'APPROVED':
      return 'secondary'
    case 'PUBLISHED':
      return 'default'
    case 'REJECTED':
      return 'destructive'
    default:
      return 'outline'
  }
}

function publishingStatusLabel(status: string): string {
  return PUBLISHING_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

function publishingStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'PUBLISHED':
      return 'default'
    case 'FAILED':
      return 'destructive'
    default:
      return 'outline'
  }
}

// Shape-agnostic of whether `summary` is project- or platform-scoped — the
// backend returns the identical ProjectAnalyticsSummary DTO for both
// GET /analytics/summary and GET /analytics/projects/:id/summary, so this
// composition is reused unchanged in both the Production Dashboard and the
// per-project Analytics tab.
export function AnalyticsSummary({ summary }: AnalyticsSummaryProps) {
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <AssetCountsChart assetCounts={summary.assetCounts} />
      <ProviderUsageChart providerUsage={summary.providerUsage} />
      <StatusCountsList
        title='Review Status'
        counts={summary.reviewStatusCounts}
        statusLabel={reviewStatusLabel}
        statusVariant={reviewStatusVariant}
        emptyMessage='No assets have been reviewed yet.'
      />
      <StatusCountsList
        title='Publishing Status'
        counts={summary.publishingStatusCounts}
        statusLabel={publishingStatusLabel}
        statusVariant={publishingStatusVariant}
        emptyMessage='Nothing has been published yet.'
      />
      <div className='lg:col-span-2'>
        <PerformanceStats
          reviewPerformance={summary.reviewPerformance}
          publishingPerformance={summary.publishingPerformance}
        />
      </div>
    </div>
  )
}

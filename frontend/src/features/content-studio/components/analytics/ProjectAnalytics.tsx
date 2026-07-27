import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

import { useProjectActivity, useProjectAnalyticsSummary } from '../../hooks/use-analytics'
import { ActivityFeed } from './ActivityFeed'
import { AnalyticsSummary } from './AnalyticsSummary'

interface ProjectAnalyticsProps {
  projectId: string
}

const PAGE_SIZE = 10

export function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const [page, setPage] = useState(1)
  const summary = useProjectAnalyticsSummary(projectId)
  const activity = useProjectActivity(projectId, page, PAGE_SIZE)

  if (summary.isLoading) {
    return (
      <div role='status' aria-label='Loading analytics' className='space-y-4'>
        <Skeleton className='h-64 w-full' />
        <Skeleton className='h-64 w-full' />
      </div>
    )
  }

  if (summary.isError || !summary.data) {
    return <p className='text-sm text-destructive'>Failed to load analytics for this project.</p>
  }

  return (
    <div className='space-y-6'>
      <AnalyticsSummary summary={summary.data} />
      <ActivityFeed
        title='Recent Activity'
        activity={activity.data}
        isLoading={activity.isLoading}
        isError={activity.isError}
        onPageChange={setPage}
      />
    </div>
  )
}

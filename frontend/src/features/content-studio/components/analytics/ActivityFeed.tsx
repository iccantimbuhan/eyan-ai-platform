import { GitBranch, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { AssetPagination } from '../assets/AssetPagination'
import type { ActivityFeedResult } from '../../types/analytics'

interface ActivityFeedProps {
  title: string
  activity: ActivityFeedResult | undefined
  isLoading: boolean
  isError: boolean
  onPageChange: (page: number) => void
}

// A plain list, not a chart — recent activity is a sequence of discrete
// events, not a quantity to plot. Generation- vs review-sourced rows are
// distinguished with an icon, not a second categorical color (text stays in
// the normal ink tokens; only the icon carries the distinction).
export function ActivityFeed({ title, activity, isLoading, isError, onPageChange }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {isLoading && (
          <div role='status' aria-label='Loading activity' className='space-y-2'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-8 w-full' />
          </div>
        )}

        {isError && <p className='text-sm text-destructive'>Failed to load recent activity.</p>}

        {!isLoading && !isError && activity && activity.items.length === 0 && (
          <p className='text-sm text-muted-foreground'>No activity yet.</p>
        )}

        {!isLoading && !isError && activity && activity.items.length > 0 && (
          <>
            <ul className='space-y-3'>
              {activity.items.map((item) => {
                const Icon = item.source === 'generation' ? Sparkles : GitBranch

                return (
                  <li key={item.id} className='flex items-start gap-2 text-sm'>
                    <Icon className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                    <div>
                      <p>{item.description}</p>
                      <p className='text-xs text-muted-foreground'>
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <AssetPagination
              page={activity.pagination.page}
              pageSize={activity.pagination.pageSize}
              total={activity.pagination.total}
              totalPages={activity.pagination.totalPages}
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

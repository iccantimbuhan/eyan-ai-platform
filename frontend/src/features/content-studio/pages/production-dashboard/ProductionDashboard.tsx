import { useState } from 'react'
import { FolderOpen, Image, Sparkles, Video } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { ActivityFeed } from '../../components/analytics/ActivityFeed'
import { AnalyticsSummary } from '../../components/analytics/AnalyticsSummary'
import {
  usePlatformActivity,
  usePlatformAnalyticsSummary,
} from '../../hooks/use-analytics'
import { useProjects } from '../../hooks/use-projects'

const CONTENT_ASSET_TYPES = [
  'BLOG',
  'EMAIL',
  'SOCIAL_MEDIA',
  'MARKETING_COPY',
  'DOCUMENTATION',
]
const ACTIVITY_PAGE_SIZE = 10

function countByType(
  assetCounts: { assetType: string; count: number }[],
  assetTypes: string[]
): number {
  return assetCounts
    .filter((entry) => assetTypes.includes(entry.assetType))
    .reduce((sum, entry) => sum + entry.count, 0)
}

// The Production Dashboard is a dedicated page inside the Content Studio
// area, deliberately separate from the platform's existing home dashboard
// (system health, models, providers) — those are different domains for
// different users. This page aggregates existing platform data end to end
// (projects, assets, brand kits, content, images, video, review,
// publishing, and the Sprint 6.5 analytics endpoints) with no new storage
// of its own.
export function ProductionDashboard() {
  const [activityPage, setActivityPage] = useState(1)
  const projects = useProjects()
  const summary = usePlatformAnalyticsSummary()
  const activity = usePlatformActivity(activityPage, ACTIVITY_PAGE_SIZE)

  const assetCounts = summary.data?.assetCounts ?? []

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-8'>
          <PageHeader
            title='Production Dashboard'
            description='Creative operations across every project — assets, review, publishing, and activity.'
            breadcrumbs={[
              { label: 'Content Studio', to: '/app/content-studio' },
              { label: 'Production Dashboard' },
            ]}
          />
        </div>

        <div className='space-y-6'>
          <div
            data-presentation-target='content-studio.dashboard-stats'
            className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
          >
            <StatCard
              title='Projects'
              value={
                projects.isLoading ? (
                  <Skeleton className='h-8 w-12' />
                ) : (
                  (projects.data?.pagination.total ?? 0)
                )
              }
              icon={<FolderOpen className='size-4' />}
            />
            <StatCard
              title='Total Assets'
              value={
                summary.isLoading ? (
                  <Skeleton className='h-8 w-12' />
                ) : (
                  (summary.data?.totalAssets ?? 0)
                )
              }
              icon={<Sparkles className='size-4' />}
            />
            <StatCard
              title='AI Content'
              value={
                summary.isLoading ? (
                  <Skeleton className='h-8 w-12' />
                ) : (
                  countByType(assetCounts, CONTENT_ASSET_TYPES)
                )
              }
              description='Blog, Email, Social, Marketing, Docs'
            />
            <StatCard
              title='AI Images'
              value={
                summary.isLoading ? (
                  <Skeleton className='h-8 w-12' />
                ) : (
                  countByType(assetCounts, ['IMAGE'])
                )
              }
              icon={<Image className='size-4' />}
            />
            <StatCard
              title='AI Video'
              value={
                summary.isLoading ? (
                  <Skeleton className='h-8 w-12' />
                ) : (
                  countByType(assetCounts, ['VIDEO'])
                )
              }
              icon={<Video className='size-4' />}
            />
            <StatCard
              title='Brand Kits'
              value={
                summary.isLoading ? (
                  <Skeleton className='h-8 w-12' />
                ) : (
                  countByType(assetCounts, ['BRAND_KIT'])
                )
              }
            />
          </div>

          {summary.isLoading && (
            <div
              role='status'
              aria-label='Loading dashboard'
              className='space-y-4'
            >
              <Skeleton className='h-64 w-full' />
              <Skeleton className='h-64 w-full' />
            </div>
          )}

          {summary.isError && (
            <p className='text-sm text-destructive'>
              Failed to load platform analytics.
            </p>
          )}

          {!summary.isLoading && !summary.isError && summary.data && (
            <AnalyticsSummary summary={summary.data} />
          )}

          <ActivityFeed
            title='Recent Activity'
            activity={activity.data}
            isLoading={activity.isLoading}
            isError={activity.isError}
            onPageChange={setActivityPage}
          />
        </div>
      </Main>
    </>
  )
}

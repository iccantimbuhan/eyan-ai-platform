import type { AssetType } from './asset'

export interface AssetTypeCount {
  assetType: AssetType
  count: number
}

export interface ProviderUsage {
  provider: string
  count: number
  avgGenerationTimeMs: number | null
}

export interface ReviewStatusCount {
  status: string
  count: number
}

export interface PublishingStatusCount {
  status: string
  count: number
}

export interface BrandKitUsage {
  brandKitId: string
  count: number
}

export interface PerformanceMetric {
  avgDurationMs: number | null
  sampleSize: number
}

export interface ProjectAnalyticsSummary {
  totalAssets: number
  assetCounts: AssetTypeCount[]
  reviewStatusCounts: ReviewStatusCount[]
  publishingStatusCounts: PublishingStatusCount[]
  providerUsage: ProviderUsage[]
  brandKitUsage: BrandKitUsage[]
  reviewPerformance: PerformanceMetric
  publishingPerformance: PerformanceMetric
}

export interface ActivityFeedItem {
  id: string
  source: 'generation' | 'review'
  type: string
  actorId: string
  actorName: string
  assetType: AssetType
  sourceId: string
  description: string
  createdAt: string
}

export interface ActivityFeedResult {
  items: ActivityFeedItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

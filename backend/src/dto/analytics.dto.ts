import type {
  AssetType,
  PublishingStatus,
  ReviewStatus,
} from "../generated/prisma/enums.js";

export interface AssetTypeCountDto {
  assetType: AssetType;
  count: number;
}

export interface ProviderUsageDto {
  provider: string;
  count: number;
  avgGenerationTimeMs: number | null;
}

export interface ReviewStatusCountDto {
  status: ReviewStatus;
  count: number;
}

export interface PublishingStatusCountDto {
  status: PublishingStatus;
  count: number;
}

export interface BrandKitUsageDto {
  brandKitId: string;
  count: number;
}

// Sample-based average — e.g. time from an asset first entering
// NEEDS_REVIEW to its first APPROVED, or from PUBLISH_STARTED to PUBLISHED.
// null/0 means no completed sample exists yet, not "zero time."
export interface PerformanceMetricDto {
  avgDurationMs: number | null;
  sampleSize: number;
}

export interface ProjectAnalyticsSummaryDto {
  totalAssets: number;
  assetCounts: AssetTypeCountDto[];
  reviewStatusCounts: ReviewStatusCountDto[];
  publishingStatusCounts: PublishingStatusCountDto[];
  providerUsage: ProviderUsageDto[];
  brandKitUsage: BrandKitUsageDto[];
  reviewPerformance: PerformanceMetricDto;
  publishingPerformance: PerformanceMetricDto;
}

export interface ActivityFeedItemDto {
  id: string;
  source: "generation" | "review";
  type: string;
  actorId: string;
  actorName: string;
  assetType: AssetType;
  sourceId: string;
  description: string;
  createdAt: Date;
}

export interface ActivityFeedResultDto {
  items: ActivityFeedItemDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GetActivityQueryDto {
  page?: number;
  pageSize?: number;
}

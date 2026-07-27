import type { AssetType, PublishingStatus } from "../generated/prisma/enums.js";

// Sprint 6.4 (Publishing Pipeline). Publishing is a workflow independent of
// QA review (ReviewStatus stays untouched) — see ADR-0010. One
// PublishingRecordDto per (assetType, sourceId, platform).
export interface PublishingRecordDto {
  id: string;
  assetType: AssetType;
  sourceId: string;
  platform: string;
  status: PublishingStatus;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  externalId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchedulePublishDto {
  platform: string;
  scheduledFor?: string;
}

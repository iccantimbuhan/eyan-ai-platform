import type { AssetType } from './asset'

// Sprint 6.4 (Publishing Pipeline). Publishing is a workflow independent of
// QA review (ReviewStatus stays untouched) — see ADR-0010. One
// PublishingRecord per (assetType, sourceId, platform).
export type PublishingStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'ARCHIVED'

export const PUBLISHING_STATUS_OPTIONS: { value: PublishingStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHING', label: 'Publishing' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

// Only the fake provider is registered today — real platforms are added
// here as they're integrated, with no redesign of this list's consumers.
export const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'fake', label: 'Fake Provider (Demo)' },
]

export interface PublishingRecord {
  id: string
  assetType: AssetType
  sourceId: string
  platform: string
  status: PublishingStatus
  scheduledFor: string | null
  publishedAt: string | null
  externalId: string | null
  externalUrl: string | null
  errorMessage: string | null
  attempts: number
  createdAt: string
  updatedAt: string
}

export interface SchedulePublishInput {
  platform: string
  scheduledFor?: string
}

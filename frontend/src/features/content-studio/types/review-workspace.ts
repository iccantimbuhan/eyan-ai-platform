import type { AssetType, ReviewStatus } from './asset'

// Sprint 6.3 (Creative Review Workspace). Comments and annotations share
// one shape — an annotation is a comment with a region or timestampMs
// anchor set. See docs/ASSET_LIBRARY.md and ADR-0009.
export interface AssetComment {
  id: string
  assetType: AssetType
  sourceId: string
  authorId: string
  authorName: string
  body: string
  isInternal: boolean
  region: { x: number; y: number; width: number; height: number } | null
  timestampMs: number | null
  resolvedAt: string | null
  resolvedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAssetCommentInput {
  body: string
  isInternal?: boolean
  region?: { x: number; y: number; width: number; height: number }
  timestampMs?: number
}

// Informational only — assigning a reviewer does not grant them access to
// the project. The project owner remains the only user who can view or act
// on it. See ADR-0009.
export interface AssetAssignment {
  id: string
  assetType: AssetType
  sourceId: string
  assigneeId: string
  assigneeName: string
  assignedById: string
  assignedByName: string
  note: string | null
  createdAt: string
}

export interface AssignReviewerInput {
  assigneeId: string
  note?: string
}

export type ReviewEventType =
  | 'STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'COMMENT_RESOLVED'
  | 'ANNOTATION_ADDED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'VERSION_CREATED'
  | 'PUBLISH_SCHEDULED'
  | 'PUBLISH_STARTED'
  | 'PUBLISHED'
  | 'PUBLISH_FAILED'

export interface AssetReviewEvent {
  id: string
  type: ReviewEventType
  actorId: string
  actorName: string
  fromStatus: ReviewStatus | null
  toStatus: ReviewStatus | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

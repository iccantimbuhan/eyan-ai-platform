import type { AssetType, ReviewEventType, ReviewStatus } from "../generated/prisma/enums.js";

// Sprint 6.3 (Creative Review Workspace). Comments and annotations share
// one shape — an annotation is a comment with a region or timestampMs
// anchor set. See ADR-0009 and AssetComment in schema.prisma.
export interface AssetCommentDto {
  id: string;
  assetType: AssetType;
  sourceId: string;
  authorId: string;
  authorName: string;
  body: string;
  isInternal: boolean;
  region: { x: number; y: number; width: number; height: number } | null;
  timestampMs: number | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetCommentDto {
  body: string;
  isInternal?: boolean;
  region?: { x: number; y: number; width: number; height: number };
  timestampMs?: number;
}

// Informational only — does not grant the assignee access to the project.
// See ADR-0009.
export interface AssetAssignmentDto {
  id: string;
  assetType: AssetType;
  sourceId: string;
  assigneeId: string;
  assigneeName: string;
  assignedById: string;
  assignedByName: string;
  note: string | null;
  createdAt: Date;
}

export interface AssignReviewerDto {
  assigneeId: string;
  note?: string;
}

export interface AssetReviewEventDto {
  id: string;
  type: ReviewEventType;
  actorId: string;
  actorName: string;
  fromStatus: ReviewStatus | null;
  toStatus: ReviewStatus | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

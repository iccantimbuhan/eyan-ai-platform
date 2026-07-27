import type {
  AssetType,
  PublishingStatus,
  ReviewStatus,
} from "../generated/prisma/enums.js";

// One QA checklist item's captured result. category groups items in the UI
// (Content vs Images vs the reserved, not-yet-reachable Videos set) — see
// docs/ASSET_LIBRARY.md for the fixed per-category item lists.
export interface ChecklistItemValue {
  category: "content" | "images" | "videos";
  item: string;
  result: "PASS" | "FAIL" | null;
  comment?: string;
}

// The unified shape every asset source (GeneratedContent, GeneratedImage,
// project-scoped SavedPrompt) is mapped into — see asset.mapper.ts, the one
// place that knows how each source maps here. Adding a future asset type
// only ever means adding one more mapper case, never changing this shape.
export interface AssetSummaryDto {
  id: string;
  assetType: AssetType;
  title: string;
  promptPreview: string;
  status: ReviewStatus;
  provider: string | null;
  model: string | null;
  version: number;
  projectId: string;
  projectName: string;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Sprint 6.3 (Creative Review Workspace) — batch-fetched alongside
  // review/version, same shape. assignee is informational only: it does
  // not grant the assignee access to the project. See ADR-0009.
  commentCount: number;
  openCommentCount: number;
  assignee: { id: string; name: string } | null;
  // Sprint 6.4 (Publishing Pipeline) — one entry per platform this asset
  // has a PublishingRecord for. Independent of `status` (QA), which stays
  // ReviewStatus-only. See ADR-0010.
  publishing: { platform: string; status: PublishingStatus }[];
}

export interface AssetDetailDto extends AssetSummaryDto {
  prompt: string;
  negativePrompt: string | null;
  output: string | null;
  generationTimeMs: number | null;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewedAt: Date | null;
  notes: string | null;
  qaScore: number | null;
  checklist: ChecklistItemValue[] | null;
}

export interface AssetVersionDto {
  id: string;
  sourceId: string;
  versionNumber: number;
  provider: string | null;
  model: string | null;
  createdAt: Date;
}

export interface ListAssetsQueryDto {
  projectId: string;
  type?: AssetType;
  status?: ReviewStatus;
  // Sprint 6.4 (Publishing Pipeline) — filters in-memory, after aggregation,
  // same boundary as every other list() filter (see ADR-0008). Matches on
  // any of the asset's publishing records having this status.
  publishingStatus?: PublishingStatus;
  provider?: string;
  model?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortDir?: "asc" | "desc";
}

export interface ReviewAssetDto {
  status?: ReviewStatus;
  notes?: string;
  qaScore?: number;
  checklist?: ChecklistItemValue[];
}

export interface BatchAssetItemRef {
  assetType: AssetType;
  sourceId: string;
}

export interface BatchAssetActionDto {
  items: BatchAssetItemRef[];
  action: "approve" | "reject" | "delete";
}

export interface BatchAssetActionResultDto {
  sourceId: string;
  assetType: AssetType;
  success: boolean;
  error?: string;
}

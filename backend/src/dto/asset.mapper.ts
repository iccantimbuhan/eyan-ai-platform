import type {
  AssetReview,
  BrandKit,
  GeneratedContent,
  GeneratedImage,
  SavedPrompt,
  User,
  VideoAsset,
} from "../generated/prisma/client.js";
import type { PublishingStatus, VideoAssetKind } from "../generated/prisma/enums.js";
import type { AssetSummaryDto, AssetDetailDto } from "./asset.dto.js";
import { isTextVideoKind } from "../config/video-prompts.js";

// Summary mapping only ever reads .status — kept structurally narrow so it
// accepts both the plain AssetReview rows list() batch-fetches (via
// findManyBySourceIds(), no reviewer relation) and the richer row
// getDetail() fetches (via findOne(), reviewer included) without either
// call site needing to know about the other's shape.
type ReviewForSummary = Pick<AssetReview, "status">;
type ReviewForDetail = AssetReview & { reviewer: User | null };

// Content generation in this codebase is deliberately single-provider (see
// docs/ARCHITECTURE.md, "Authentication Architecture" section) — there's no
// GeneratedContent.provider column because there's only ever one. Matches
// the existing "ollama" literal in health.service.ts rather than inventing
// a shared constant for a value used in exactly two places.
export const CONTENT_PROVIDER_NAME = "ollama";

const TITLE_LENGTH = 60;
const PREVIEW_LENGTH = 160;

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

interface ProjectRef {
  id: string;
  name: string;
}

// Sprint 6.3 (Creative Review Workspace) — comment stats and assignment are
// batch-fetched by AssetService.list()/getDetail() alongside review/version,
// same shape. assignee is informational only (see ADR-0009): it never
// grants the assignee access to the project.
export interface CommentStats {
  total: number;
  open: number;
}

export interface AssigneeRef {
  id: string;
  name: string;
}

// Sprint 6.4 (Publishing Pipeline) — one entry per platform this asset has
// a PublishingRecord for, batch-fetched by AssetService.list()/getDetail()
// alongside review/version/comments/assignment, same shape. Deliberately
// decoupled from ReviewStatus (see ADR-0010): an asset's QA status and its
// publishing status are independent.
export interface PublishingSummary {
  platform: string;
  status: PublishingStatus;
}

function baseFields(
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined,
  commentStats: CommentStats | undefined,
  assignee: AssigneeRef | undefined,
  publishing: PublishingSummary[] | undefined
) {
  return {
    status: review?.status ?? ("DRAFT" as const),
    version: version?.versionNumber ?? 1,
    commentCount: commentStats?.total ?? 0,
    openCommentCount: commentStats?.open ?? 0,
    assignee: assignee ?? null,
    publishing: publishing ?? [],
  };
}

export function mapContentToSummary(
  row: GeneratedContent,
  project: ProjectRef,
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetSummaryDto {
  return {
    id: row.id,
    assetType: row.type,
    title: truncate(row.prompt, TITLE_LENGTH),
    promptPreview: truncate(row.prompt, PREVIEW_LENGTH),
    provider: CONTENT_PROVIDER_NAME,
    model: row.model,
    projectId: project.id,
    projectName: project.name,
    thumbnailUrl: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...baseFields(review, version, commentStats, assignee, publishing),
  };
}

export function mapContentToDetail(
  row: GeneratedContent,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetDetailDto {
  return {
    ...mapContentToSummary(row, project, review, version, commentStats, assignee, publishing),
    prompt: row.prompt,
    negativePrompt: null,
    output: row.output,
    generationTimeMs: row.generationTimeMs,
    reviewerId: review?.reviewerId ?? null,
    reviewerName: review?.reviewer?.name ?? null,
    reviewedAt: review?.reviewedAt ?? null,
    notes: review?.notes ?? null,
    qaScore: review?.qaScore ?? null,
    checklist: (review?.checklist as AssetDetailDto["checklist"]) ?? null,
  };
}

export function mapImageToSummary(
  row: GeneratedImage,
  project: ProjectRef,
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetSummaryDto {
  return {
    id: row.id,
    assetType: "IMAGE",
    title: truncate(row.prompt, TITLE_LENGTH),
    promptPreview: truncate(row.prompt, PREVIEW_LENGTH),
    provider: row.provider,
    model: row.model,
    projectId: project.id,
    projectName: project.name,
    // Relative storage path, not an absolute URL — resolved by the
    // frontend via resolveImageUrl(), exactly like GeneratedImage's own
    // storagePath already is in the Content Studio Images tab.
    thumbnailUrl:
      row.status === "COMPLETED" && row.storagePath ? row.storagePath : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...baseFields(review, version, commentStats, assignee, publishing),
  };
}

export function mapImageToDetail(
  row: GeneratedImage,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetDetailDto {
  return {
    ...mapImageToSummary(row, project, review, version, commentStats, assignee, publishing),
    prompt: row.prompt,
    negativePrompt: row.negativePrompt,
    output: null,
    generationTimeMs: row.generationTimeMs,
    reviewerId: review?.reviewerId ?? null,
    reviewerName: review?.reviewer?.name ?? null,
    reviewedAt: review?.reviewedAt ?? null,
    notes: review?.notes ?? null,
    qaScore: review?.qaScore ?? null,
    checklist: (review?.checklist as AssetDetailDto["checklist"]) ?? null,
  };
}

export function mapSavedPromptToSummary(
  row: SavedPrompt,
  project: ProjectRef,
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetSummaryDto {
  return {
    id: row.id,
    assetType: "PROMPT_TEMPLATE",
    title: row.name,
    promptPreview: truncate(row.promptBody, PREVIEW_LENGTH),
    // Not AI-generated — a saved prompt is user-authored, so there's no
    // provider/model to report, unlike every other asset type.
    provider: null,
    model: null,
    projectId: project.id,
    projectName: project.name,
    thumbnailUrl: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...baseFields(review, version, commentStats, assignee, publishing),
  };
}

export function mapSavedPromptToDetail(
  row: SavedPrompt,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetDetailDto {
  return {
    ...mapSavedPromptToSummary(row, project, review, version, commentStats, assignee, publishing),
    prompt: row.promptBody,
    negativePrompt: null,
    output: row.promptBody,
    generationTimeMs: null,
    reviewerId: review?.reviewerId ?? null,
    reviewerName: review?.reviewer?.name ?? null,
    reviewedAt: review?.reviewedAt ?? null,
    notes: review?.notes ?? null,
    qaScore: review?.qaScore ?? null,
    checklist: (review?.checklist as AssetDetailDto["checklist"]) ?? null,
  };
}

// A Brand Kit is user-authored guidance, not AI-generated — same
// "no provider/model" reasoning as SavedPrompt above. promptPreview
// surfaces its tone/audience guidance rather than a generation prompt,
// since a Brand Kit has none.
export function mapBrandKitToSummary(
  row: BrandKit,
  project: ProjectRef,
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetSummaryDto {
  const previewSource =
    [row.toneOfVoice, row.audience].filter(Boolean).join(" — ") ||
    row.client ||
    row.name;

  return {
    id: row.id,
    assetType: "BRAND_KIT",
    title: row.name,
    promptPreview: truncate(previewSource, PREVIEW_LENGTH),
    provider: null,
    model: null,
    projectId: project.id,
    projectName: project.name,
    thumbnailUrl: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...baseFields(review, version, commentStats, assignee, publishing),
  };
}

export function mapBrandKitToDetail(
  row: BrandKit,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetDetailDto {
  return {
    ...mapBrandKitToSummary(row, project, review, version, commentStats, assignee, publishing),
    prompt: row.brandGuidelines ?? row.toneOfVoice ?? "",
    negativePrompt: null,
    output: null,
    generationTimeMs: null,
    reviewerId: review?.reviewerId ?? null,
    reviewerName: review?.reviewer?.name ?? null,
    reviewedAt: review?.reviewedAt ?? null,
    notes: review?.notes ?? null,
    qaScore: review?.qaScore ?? null,
    checklist: (review?.checklist as AssetDetailDto["checklist"]) ?? null,
  };
}

const VIDEO_KIND_LABELS: Record<VideoAssetKind, string> = {
  SCRIPT: "Script",
  SCENE_BREAKDOWN: "Scene Breakdown",
  SHOT_LIST: "Shot List",
  VOICE_OVER_SCRIPT: "Voice-over Script",
  CAPTIONS: "Captions",
  SUBTITLES: "Subtitles",
  STORYBOARD: "Storyboard",
  THUMBNAIL: "Thumbnail",
};

// A VideoAsset is AI-generated like GeneratedContent/GeneratedImage — kind
// distinguishes a text artifact (output populated) from an image artifact
// (provider/storagePath populated), both surfaced under one AssetType.VIDEO
// value. See VideoAssetKind and docs/ASSET_LIBRARY.md.
export function mapVideoAssetToSummary(
  row: VideoAsset,
  project: ProjectRef,
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetSummaryDto {
  return {
    id: row.id,
    assetType: "VIDEO",
    title: truncate(`${VIDEO_KIND_LABELS[row.kind]} — ${row.prompt}`, TITLE_LENGTH),
    promptPreview: truncate(row.prompt, PREVIEW_LENGTH),
    // Text kinds have no provider column of their own (ChatService/
    // OllamaProvider, same reasoning as CONTENT_PROVIDER_NAME above); image
    // kinds populate it exactly like GeneratedImage.
    provider: row.provider ?? (isTextVideoKind(row.kind) ? CONTENT_PROVIDER_NAME : null),
    model: row.model,
    projectId: project.id,
    projectName: project.name,
    thumbnailUrl:
      row.status === "COMPLETED" && row.storagePath ? row.storagePath : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...baseFields(review, version, commentStats, assignee, publishing),
  };
}

export function mapVideoAssetToDetail(
  row: VideoAsset,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined,
  commentStats?: CommentStats,
  assignee?: AssigneeRef,
  publishing?: PublishingSummary[]
): AssetDetailDto {
  return {
    ...mapVideoAssetToSummary(row, project, review, version, commentStats, assignee, publishing),
    prompt: row.prompt,
    negativePrompt: null,
    output: row.output,
    generationTimeMs: row.generationTimeMs,
    reviewerId: review?.reviewerId ?? null,
    reviewerName: review?.reviewer?.name ?? null,
    reviewedAt: review?.reviewedAt ?? null,
    notes: review?.notes ?? null,
    qaScore: review?.qaScore ?? null,
    checklist: (review?.checklist as AssetDetailDto["checklist"]) ?? null,
  };
}

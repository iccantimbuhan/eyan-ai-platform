import type {
  AssetReview,
  GeneratedContent,
  GeneratedImage,
  SavedPrompt,
  User,
} from "../generated/prisma/client.js";
import type { AssetSummaryDto, AssetDetailDto } from "./asset.dto.js";

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

function baseFields(
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined
) {
  return {
    status: review?.status ?? ("DRAFT" as const),
    version: version?.versionNumber ?? 1,
  };
}

export function mapContentToSummary(
  row: GeneratedContent,
  project: ProjectRef,
  review: ReviewForSummary | undefined,
  version: { versionNumber: number } | undefined
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
    ...baseFields(review, version),
  };
}

export function mapContentToDetail(
  row: GeneratedContent,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined
): AssetDetailDto {
  return {
    ...mapContentToSummary(row, project, review, version),
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
  version: { versionNumber: number } | undefined
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
    ...baseFields(review, version),
  };
}

export function mapImageToDetail(
  row: GeneratedImage,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined
): AssetDetailDto {
  return {
    ...mapImageToSummary(row, project, review, version),
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
  version: { versionNumber: number } | undefined
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
    ...baseFields(review, version),
  };
}

export function mapSavedPromptToDetail(
  row: SavedPrompt,
  project: ProjectRef,
  review: ReviewForDetail | undefined,
  version: { versionNumber: number } | undefined
): AssetDetailDto {
  return {
    ...mapSavedPromptToSummary(row, project, review, version),
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

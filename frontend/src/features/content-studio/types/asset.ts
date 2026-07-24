// Mirrors backend/src/generated/prisma/enums.ts' AssetType exactly. The
// first five values are ContentType's values (a generated content item's
// own `type` doubles as its assetType) plus IMAGE and PROMPT_TEMPLATE, the
// two other real asset sources the Asset Library aggregates. Adding a
// future asset type (e.g. VIDEO) only ever means adding one more value
// here plus one more backend enum value + mapper case — see
// docs/ASSET_LIBRARY.md.
export type AssetType =
  | 'BLOG'
  | 'EMAIL'
  | 'SOCIAL_MEDIA'
  | 'MARKETING_COPY'
  | 'DOCUMENTATION'
  | 'IMAGE'
  | 'PROMPT_TEMPLATE'

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'BLOG', label: 'Blog' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SOCIAL_MEDIA', label: 'Social Post' },
  { value: 'MARKETING_COPY', label: 'Marketing Copy' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'PROMPT_TEMPLATE', label: 'Prompt Template' },
]

export type ReviewStatus =
  | 'DRAFT'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'

export const REVIEW_STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PUBLISHED', label: 'Published' },
]

export type ChecklistCategory = 'content' | 'images' | 'videos'
export type ChecklistResult = 'PASS' | 'FAIL' | null

export interface ChecklistItemValue {
  category: ChecklistCategory
  item: string
  result: ChecklistResult
  comment?: string
}

// Fixed per-category checklist items (brief-defined, not user-configurable
// this sprint). "videos" is reserved for future-ready video assets — not
// reachable in this sprint's UI since no video asset type exists yet.
export const CHECKLIST_ITEMS: Record<ChecklistCategory, string[]> = {
  content: ['Grammar', 'Brand Consistency', 'Tone', 'Readability'],
  images: ['Prompt Accuracy', 'Composition', 'Visual Quality', 'Safety'],
  videos: ['Visual Quality', 'Audio Quality', 'Timing', 'Branding'],
}

// PROMPT_TEMPLATE reuses the content checklist (it's textual, same concerns
// as any other written asset) — every other current asset type maps
// one-to-one.
export function checklistCategoryForAssetType(
  assetType: AssetType
): ChecklistCategory {
  return assetType === 'IMAGE' ? 'images' : 'content'
}

// Neither Regenerate nor Duplicate makes sense for a prompt template: it's
// user-authored, not provider-generated, so there's nothing to re-run.
export function supportsRegeneration(assetType: AssetType): boolean {
  return assetType !== 'PROMPT_TEMPLATE'
}

export interface AssetSummary {
  id: string
  assetType: AssetType
  title: string
  promptPreview: string
  status: ReviewStatus
  provider: string | null
  model: string | null
  version: number
  projectId: string
  projectName: string
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AssetDetail extends AssetSummary {
  prompt: string
  negativePrompt: string | null
  output: string | null
  generationTimeMs: number | null
  reviewerId: string | null
  reviewerName: string | null
  reviewedAt: string | null
  notes: string | null
  qaScore: number | null
  checklist: ChecklistItemValue[] | null
}

export interface AssetVersionSummary {
  id: string
  sourceId: string
  versionNumber: number
  provider: string | null
  model: string | null
  createdAt: string
}

export interface ListAssetsParams {
  type?: AssetType
  status?: ReviewStatus
  provider?: string
  model?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortDir?: 'asc' | 'desc'
}

export interface ReviewAssetInput {
  status?: ReviewStatus
  notes?: string
  qaScore?: number
  checklist?: ChecklistItemValue[]
}

export interface BatchAssetItemRef {
  assetType: AssetType
  sourceId: string
}

export type BatchAssetAction = 'approve' | 'reject' | 'delete'

export interface BatchAssetActionResult {
  sourceId: string
  assetType: AssetType
  success: boolean
  error?: string
}

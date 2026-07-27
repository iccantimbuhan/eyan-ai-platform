// Mirrors backend/src/generated/prisma/enums.ts' VideoAssetKind exactly.
export type VideoAssetKind =
  | 'SCRIPT'
  | 'SCENE_BREAKDOWN'
  | 'SHOT_LIST'
  | 'VOICE_OVER_SCRIPT'
  | 'CAPTIONS'
  | 'SUBTITLES'
  | 'STORYBOARD'
  | 'THUMBNAIL'

export const TEXT_VIDEO_KINDS: VideoAssetKind[] = [
  'SCRIPT',
  'SCENE_BREAKDOWN',
  'SHOT_LIST',
  'VOICE_OVER_SCRIPT',
  'CAPTIONS',
  'SUBTITLES',
]

export const IMAGE_VIDEO_KINDS: VideoAssetKind[] = ['STORYBOARD', 'THUMBNAIL']

export function isTextVideoKind(kind: VideoAssetKind): boolean {
  return TEXT_VIDEO_KINDS.includes(kind)
}

export const VIDEO_KIND_OPTIONS: { value: VideoAssetKind; label: string }[] = [
  { value: 'SCRIPT', label: 'Script' },
  { value: 'SCENE_BREAKDOWN', label: 'Scene Breakdown' },
  { value: 'SHOT_LIST', label: 'Shot List' },
  { value: 'VOICE_OVER_SCRIPT', label: 'Voice-over Script' },
  { value: 'CAPTIONS', label: 'Captions' },
  { value: 'SUBTITLES', label: 'Subtitles' },
  { value: 'STORYBOARD', label: 'Storyboard' },
  { value: 'THUMBNAIL', label: 'Thumbnail' },
]

export function videoKindLabel(kind: VideoAssetKind): string {
  return VIDEO_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind
}

export type VideoAssetStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface VideoAsset {
  id: string
  projectId: string
  brandKitId: string | null
  videoGroupId: string
  kind: VideoAssetKind
  prompt: string
  output: string | null
  provider: string | null
  width: number | null
  height: number | null
  format: string | null
  storagePath: string | null
  thumbnailPath: string | null
  model: string | null
  status: VideoAssetStatus
  errorMessage: string | null
  generationTimeMs: number | null
  createdAt: string
  updatedAt: string
}

export interface GenerateVideoAssetInput {
  projectId: string
  kind: VideoAssetKind
  prompt: string
  videoGroupId?: string
  brandKitId?: string
  provider?: string
  width?: number
  height?: number
}

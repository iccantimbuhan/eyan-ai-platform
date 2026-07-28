// Mirrors backend/src/generated/prisma/enums.ts' VideoAssetKind exactly.
// UPLOADED_SOURCE (Sprint 7.2.1) is a real uploaded video file, not an
// AI-generated artifact — see VIDEO_FILE_KINDS below.
export type VideoAssetKind =
  | 'SCRIPT'
  | 'SCENE_BREAKDOWN'
  | 'SHOT_LIST'
  | 'VOICE_OVER_SCRIPT'
  | 'CAPTIONS'
  | 'SUBTITLES'
  | 'STORYBOARD'
  | 'THUMBNAIL'
  | 'UPLOADED_SOURCE'
  | 'EDITED_VIDEO'

export const TEXT_VIDEO_KINDS: VideoAssetKind[] = [
  'SCRIPT',
  'SCENE_BREAKDOWN',
  'SHOT_LIST',
  'VOICE_OVER_SCRIPT',
  'CAPTIONS',
  'SUBTITLES',
]

export const IMAGE_VIDEO_KINDS: VideoAssetKind[] = ['STORYBOARD', 'THUMBNAIL']

// Real video-file kinds (Sprint 7.2.1 UPLOADED_SOURCE, Sprint 7.2.3
// EDITED_VIDEO) — rendered as a <video> player, not the text/image
// branches VideoAssetList already has. Deliberately not folded into
// IMAGE_VIDEO_KINDS: neither is generatable via VideoGenerateForm.
export const VIDEO_FILE_KINDS: VideoAssetKind[] = ['UPLOADED_SOURCE', 'EDITED_VIDEO']

export function isTextVideoKind(kind: VideoAssetKind): boolean {
  return TEXT_VIDEO_KINDS.includes(kind)
}

export function isVideoFileKind(kind: VideoAssetKind): boolean {
  return VIDEO_FILE_KINDS.includes(kind)
}

// UPLOADED_SOURCE is deliberately absent from VIDEO_KIND_OPTIONS: it's
// only ever created via the upload endpoint (VideoSourceUpload), never
// through VideoGenerateForm's kind picker. videoKindLabel() below still
// has its own label for display in VideoAssetList.
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

const VIDEO_KIND_LABELS: Record<VideoAssetKind, string> = {
  SCRIPT: 'Script',
  SCENE_BREAKDOWN: 'Scene Breakdown',
  SHOT_LIST: 'Shot List',
  VOICE_OVER_SCRIPT: 'Voice-over Script',
  CAPTIONS: 'Captions',
  SUBTITLES: 'Subtitles',
  STORYBOARD: 'Storyboard',
  THUMBNAIL: 'Thumbnail',
  UPLOADED_SOURCE: 'Uploaded Source',
  EDITED_VIDEO: 'Edited Video',
}

export function videoKindLabel(kind: VideoAssetKind): string {
  return VIDEO_KIND_LABELS[kind] ?? kind
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
  // UPLOADED_SOURCE-only real video file metadata (Sprint 7.2.1).
  durationMs: number | null
  videoFormat: string | null
  sourceFileName: string | null
  // EDITED_VIDEO-only, set when the executed workflow included a
  // "subtitles" step (Sprint 7.2.4).
  subtitlePath: string | null
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

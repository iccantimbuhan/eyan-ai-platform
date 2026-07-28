import type { WorkflowOperation } from '../../api/video-workflow-planner.api'

export const OPERATION_LABELS: Record<WorkflowOperation, string> = {
  trim: 'Trim',
  remove_silence: 'Remove Silence',
  normalize_audio: 'Normalize Audio',
  resize: 'Resize',
  shorts: 'Convert to Shorts',
  subtitles: 'Subtitles',
  blur_faces: 'Blur Faces',
  auto_zoom: 'Auto Zoom',
  brightness: 'Brightness',
  background_music: 'Background Music',
}

export function operationLabel(operation: string): string {
  return OPERATION_LABELS[operation as WorkflowOperation] ?? operation
}

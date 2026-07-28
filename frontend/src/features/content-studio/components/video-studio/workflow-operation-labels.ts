import type { WorkflowOperation } from '../../api/video-workflow-planner.api'

export const OPERATION_LABELS: Record<WorkflowOperation, string> = {
  trim: 'Trim',
  remove_silence: 'Remove Silence',
  normalize_audio: 'Normalize Audio',
  resize: 'Resize',
  brightness: 'Brightness',
  subtitles: 'Subtitles',
}

export function operationLabel(operation: string): string {
  return OPERATION_LABELS[operation as WorkflowOperation] ?? operation
}

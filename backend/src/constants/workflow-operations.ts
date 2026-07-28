// Single source of truth for which video-workflow operations exist end to
// end: the AI planner is only ever told about (and only ever allowed to
// return) operations listed here, and the execution engine can only ever
// execute operations listed here. Before Sprint 8.1 these were four
// independently hand-maintained lists (the planner's prompt text, the Zod
// validator's discriminated union, FFmpegVideoProvider.SUPPORTED_OPERATIONS,
// and the frontend's WorkflowOperation type) that had already drifted apart
// enough that the planner could hand back operations (blur_faces, auto_zoom,
// shorts, background_music) the execution engine had no way to run.
//
// To add a new operation once its execution path is actually implemented:
// 1. Add an entry here.
// 2. Add its Zod step schema + a case in STEP_SCHEMAS_BY_OPERATION
//    (video-workflow-plan.validator.ts) — TypeScript will fail to compile
//    until you do, since that map is typed as Record<ExecutableOperation, ...>.
// 3. Implement it in FFmpegVideoProvider.run() (or, like "subtitles", as its
//    own step in VideoExecutionEngineService.execute()).
// 4. Mirror the operation in the frontend's WorkflowOperation type and
//    OPERATION_LABELS.
export const EXECUTABLE_OPERATIONS = [
  {
    operation: "trim",
    description: "{ startSec, endSec? } trim the video to a range in seconds",
  },
  {
    operation: "remove_silence",
    description: "{} remove silent segments",
  },
  {
    operation: "normalize_audio",
    description: "{} normalize loudness",
  },
  {
    operation: "resize",
    description: '{ aspectRatio: "16:9"|"9:16"|"1:1"|"4:5" } change aspect ratio',
  },
  {
    operation: "brightness",
    description: "{ level: -100..100 } adjust brightness",
  },
  {
    operation: "subtitles",
    description: '{ language } generate and burn in subtitles (language defaults to "auto")',
  },
] as const;

export type ExecutableOperation = (typeof EXECUTABLE_OPERATIONS)[number]["operation"];

export const EXECUTABLE_OPERATION_NAMES: readonly ExecutableOperation[] = EXECUTABLE_OPERATIONS.map(
  (entry) => entry.operation
);

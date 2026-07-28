import { query } from "express-validator";
import { z } from "zod";

import { type ExecutableOperation } from "../constants/workflow-operations.js";

// The operation catalog is the shared EXECUTABLE_OPERATIONS list
// (backend/src/constants/workflow-operations.ts) — the planner only ever
// selects from these, and this is the schema that enforces it. New
// operations are added as a new discriminated-union member wired up in
// STEP_SCHEMAS_BY_OPERATION below, never as free-form fields.
const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5"] as const;

const EmptyParamsSchema = z.object({}).strict();

const TrimStepSchema = z
  .object({
    operation: z.literal("trim"),
    params: z
      .object({
        startSec: z.number().min(0),
        endSec: z.number().min(0).optional(),
      })
      .strict(),
  })
  .strict();

const RemoveSilenceStepSchema = z
  .object({ operation: z.literal("remove_silence"), params: EmptyParamsSchema })
  .strict();

const NormalizeAudioStepSchema = z
  .object({ operation: z.literal("normalize_audio"), params: EmptyParamsSchema })
  .strict();

const ResizeStepSchema = z
  .object({
    operation: z.literal("resize"),
    params: z.object({ aspectRatio: z.enum(ASPECT_RATIOS) }).strict(),
  })
  .strict();

const SubtitlesStepSchema = z
  .object({
    operation: z.literal("subtitles"),
    params: z
      .object({ language: z.string().trim().min(2).max(10).default("auto") })
      .strict(),
  })
  .strict();

const BrightnessStepSchema = z
  .object({
    operation: z.literal("brightness"),
    params: z.object({ level: z.number().min(-100).max(100) }).strict(),
  })
  .strict();

// `satisfies Record<ExecutableOperation, ...>` (not a `:` type annotation)
// so every key keeps its own precise schema type below instead of widening
// to z.ZodTypeAny — that's what lets z.discriminatedUnion still infer each
// step's real shape. The `satisfies` clause is what does the enforcing:
// adding an operation to EXECUTABLE_OPERATIONS without adding a matching
// key here (or adding a key here that isn't in EXECUTABLE_OPERATIONS) is a
// compile error, so the planner's schema can never silently drift from the
// shared capability list.
const STEP_SCHEMAS_BY_OPERATION = {
  trim: TrimStepSchema,
  remove_silence: RemoveSilenceStepSchema,
  normalize_audio: NormalizeAudioStepSchema,
  resize: ResizeStepSchema,
  brightness: BrightnessStepSchema,
  subtitles: SubtitlesStepSchema,
} satisfies Record<ExecutableOperation, z.ZodTypeAny>;

export const WorkflowStepSchema = z.discriminatedUnion("operation", [
  STEP_SCHEMAS_BY_OPERATION.trim,
  STEP_SCHEMAS_BY_OPERATION.remove_silence,
  STEP_SCHEMAS_BY_OPERATION.normalize_audio,
  STEP_SCHEMAS_BY_OPERATION.resize,
  STEP_SCHEMAS_BY_OPERATION.brightness,
  STEP_SCHEMAS_BY_OPERATION.subtitles,
]);

const MAX_STEPS = 20;

// superRefine (not a per-step .refine()) because discriminatedUnion members
// must stay plain ZodObjects for the discriminant to resolve — the
// startSec/endSec ordering check runs here instead, over the whole array.
export const WorkflowSchema = z
  .object({
    steps: z
      .array(WorkflowStepSchema)
      .min(1, "The plan must include at least one step.")
      .max(MAX_STEPS, `The plan must not exceed ${MAX_STEPS} steps.`),
  })
  .strict()
  .superRefine((data, ctx) => {
    data.steps.forEach((step, index) => {
      if (
        step.operation === "trim" &&
        step.params.endSec !== undefined &&
        step.params.endSec <= step.params.startSec
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "trim.endSec must be greater than trim.startSec.",
          path: ["steps", index, "params", "endSec"],
        });
      }
    });
  });

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

export const PlanVideoWorkflowSchema = z
  .object({
    videoAssetId: z.string().trim().min(1, "Video asset ID is required."),
    prompt: z
      .string()
      .trim()
      .min(1, "Prompt is required.")
      .max(1000, "Prompt must not exceed 1000 characters."),
  })
  .strict();

export type PlanVideoWorkflowRequest = z.infer<typeof PlanVideoWorkflowSchema>;

// GET query-param endpoint — express-validator, matching every other
// listing endpoint's query() convention (e.g. listVideoAssetsValidator),
// not Zod (reserved here for JSON request bodies).
export const listVideoWorkflowPlansValidator = [
  query("projectId").trim().notEmpty().withMessage("Project ID is required."),
];

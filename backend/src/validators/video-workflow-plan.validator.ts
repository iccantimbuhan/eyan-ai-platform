import { query } from "express-validator";
import { z } from "zod";

// The fixed operation catalog for Sprint 7.2.2 (Workflow Planner). The
// planner only ever selects from these — new operations are added here as
// a new discriminated-union member, never as free-form fields. See
// VideoWorkflowPlannerService and the approved Sprint 7.2 architecture
// (operation catalog, §6).
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

const ShortsStepSchema = z
  .object({ operation: z.literal("shorts"), params: EmptyParamsSchema })
  .strict();

const SubtitlesStepSchema = z
  .object({
    operation: z.literal("subtitles"),
    params: z
      .object({ language: z.string().trim().min(2).max(10).default("auto") })
      .strict(),
  })
  .strict();

const BlurFacesStepSchema = z
  .object({ operation: z.literal("blur_faces"), params: EmptyParamsSchema })
  .strict();

const AutoZoomStepSchema = z
  .object({ operation: z.literal("auto_zoom"), params: EmptyParamsSchema })
  .strict();

const BrightnessStepSchema = z
  .object({
    operation: z.literal("brightness"),
    params: z.object({ level: z.number().min(-100).max(100) }).strict(),
  })
  .strict();

// volume is planning-only: which second audio file actually gets mixed in
// is an execution-engine concern (Sprint 7.2.3+), not this milestone's.
const BackgroundMusicStepSchema = z
  .object({
    operation: z.literal("background_music"),
    params: z.object({ volume: z.number().min(0).max(100).default(50) }).strict(),
  })
  .strict();

export const WorkflowStepSchema = z.discriminatedUnion("operation", [
  TrimStepSchema,
  RemoveSilenceStepSchema,
  NormalizeAudioStepSchema,
  ResizeStepSchema,
  ShortsStepSchema,
  SubtitlesStepSchema,
  BlurFacesStepSchema,
  AutoZoomStepSchema,
  BrightnessStepSchema,
  BackgroundMusicStepSchema,
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

import { z } from "zod";

// JSON body endpoint (POST /api/v1/video-edit/execute) — Zod-inline in the
// controller, matching ChatController/VideoWorkflowPlannerController.
export const ExecuteWorkflowSchema = z
  .object({
    workflowPlanId: z.string().trim().min(1, "Workflow plan ID is required."),
  })
  .strict();

export type ExecuteWorkflowRequest = z.infer<typeof ExecuteWorkflowSchema>;

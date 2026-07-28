import type { Workflow } from "../validators/video-workflow-plan.validator.js";

export interface VideoWorkflowPlanResponseDto {
  id: string;
  projectId: string;
  videoAssetId: string;
  prompt: string;
  workflow: Workflow;
  model: string | null;
  // Sprint 7.2.3 — set once VideoExecutionEngineService has run this plan.
  resultVideoAssetId: string | null;
  executedAt: Date | null;
  createdAt: Date;
}

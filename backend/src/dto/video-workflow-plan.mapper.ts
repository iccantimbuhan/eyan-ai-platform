import type { VideoWorkflowPlan } from "../generated/prisma/client.js";
import type { VideoWorkflowPlanResponseDto } from "./video-workflow-plan.dto.js";
import type { Workflow } from "../validators/video-workflow-plan.validator.js";

export function mapVideoWorkflowPlanToResponse(
  row: VideoWorkflowPlan
): VideoWorkflowPlanResponseDto {
  return {
    id: row.id,
    projectId: row.projectId,
    videoAssetId: row.videoAssetId,
    prompt: row.prompt,
    // Trusted cast: workflow is only ever persisted after WorkflowSchema
    // has already validated it — see VideoWorkflowPlannerService.
    workflow: row.workflow as unknown as Workflow,
    model: row.model,
    resultVideoAssetId: row.resultVideoAssetId,
    executedAt: row.executedAt,
    createdAt: row.createdAt,
  };
}

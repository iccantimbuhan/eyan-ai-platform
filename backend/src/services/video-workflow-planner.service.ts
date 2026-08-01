import { VideoAssetRepository } from "../repositories/video-asset.repository.js";
import { VideoWorkflowPlanRepository } from "../repositories/video-workflow-plan.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { aiCapabilityService, AiCapabilityService } from "./ai-capability.service.js";
import type { AiInvokeResult } from "./ai-routing.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { ApiError } from "../errors/api-error.js";
import {
  InvalidWorkflowSourceError,
  WorkflowPlanningFailedError,
} from "../errors/video-workflow.error.js";
import { WorkflowSchema, type Workflow } from "../validators/video-workflow-plan.validator.js";
import { EXECUTABLE_OPERATIONS, EXECUTABLE_OPERATION_NAMES } from "../constants/workflow-operations.js";
import { logger } from "../lib/logger.js";

export interface PlanWorkflowInput {
  videoAssetId: string;
  prompt: string;
}

const MAX_ATTEMPTS = 2;
const VIDEO_PLANNING_CAPABILITY_KEY = "video-planning";

// Sprint 7.2.2 — Workflow Planner only: turns a natural-language editing
// request into a validated, structured plan. Never executes it — that's
// the Execution Engine's job (Sprint 7.2.3+, a deliberately separate
// milestone per the approved architecture). Sprint 3 (AI Core adoption)
// replaced the direct ChatService call with an AI Core `video-planning`
// Capability invoke — the operation catalog, Zod validation, and the
// 2-attempt corrective-retry loop below are unchanged planning logic; only
// how the actual model call happens moved to AI Core (see
// prisma/seed-ai-core.ts's seedVideoPlanningBrain() for the Brain/Prompt
// this resolves to).
export class VideoWorkflowPlannerService {
  constructor(
    private readonly videoAssetRepository = new VideoAssetRepository(),
    private readonly workflowPlanRepository = new VideoWorkflowPlanRepository(),
    private readonly capabilityService: AiCapabilityService = aiCapabilityService,
    private readonly projectRepository = new ProjectRepository()
  ) {}

  // Sprint 7.2.3 — added so the frontend (and the Execution Engine's own
  // "select an existing workflow" UI) has a way to list previously
  // generated plans; no listing endpoint existed when only planning itself
  // was in scope (Sprint 7.2.2).
  async list(projectId: string, userId: string) {
    const project = await this.projectRepository.findById(projectId, userId);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    return this.workflowPlanRepository.findManyByProject(projectId, userId);
  }

  async plan(data: PlanWorkflowInput, userId: string) {
    const videoAsset = await this.videoAssetRepository.findById(data.videoAssetId, userId);

    if (!videoAsset) {
      throw new NotFoundError("Video asset not found.");
    }

    // Only a real uploaded video file has the ffprobe-derived metadata
    // (duration/resolution/format) the planner prompt below is built
    // from — see VideoSourceService. A future EDITED_VIDEO output could
    // reasonably become a plannable source too, but that's out of scope
    // for this milestone.
    if (videoAsset.kind !== "UPLOADED_SOURCE") {
      throw new InvalidWorkflowSourceError();
    }

    const baseInput = {
      durationMs: videoAsset.durationMs ?? "unknown",
      width: videoAsset.width ?? "unknown",
      height: videoAsset.height ?? "unknown",
      videoFormat: videoAsset.videoFormat ?? "unknown",
      operationCatalog: OPERATION_CATALOG,
      allowedOperationsLine: ALLOWED_OPERATIONS_LINE,
      prompt: data.prompt,
    };

    let lastError = "The AI did not return a response.";
    let modelUsed: string | undefined;
    let correctionNotice = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const invokeResult = await this.capabilityService.invoke(
        VIDEO_PLANNING_CAPABILITY_KEY,
        { ...baseInput, correctionNotice },
        { expectJson: true },
        userId
      );

      if (invokeResult.outcome === "TRANSIENT_FAILURE" || invokeResult.outcome === "DEFINITIVE_FAILURE") {
        // A real provider/network failure, not a content-quality issue —
        // the old direct-ChatService call propagated this immediately
        // rather than consuming a corrective-retry attempt on it; preserved
        // here for identical error handling.
        throw new ApiError(503, "Unable to connect to AI provider.");
      }

      modelUsed = invokeResult.model;
      const result = parseWorkflow(invokeResult);

      if (result.success) {
        const created = await this.workflowPlanRepository.create({
          projectId: videoAsset.projectId,
          videoAssetId: videoAsset.id,
          prompt: data.prompt,
          workflow: result.workflow,
          model: modelUsed,
          createdBy: userId,
        });

        return created;
      }

      lastError = result.error;

      logger.warn(
        `[VideoWorkflowPlannerService] Attempt ${attempt} produced an invalid plan for video asset ${data.videoAssetId}: ${lastError}`
      );

      // One corrective retry: hand the model its own bad output plus the
      // exact validation error and ask for a fixed, pure-JSON response. AI
      // Core's invoke() has no multi-turn conversation support (Sprint 3
      // scope decision), so this is folded into the next attempt's input
      // instead of appended as separate assistant/user turns.
      correctionNotice = `Your previous response was invalid: ${lastError}\n\nYour previous response was:\n${invokeResult.output}\n\nRespond again with ONLY the corrected JSON object. No markdown, no explanations, no code fences.`;
    }

    logger.error(
      `[VideoWorkflowPlannerService] Failed to produce a valid plan for video asset ${data.videoAssetId} after ${MAX_ATTEMPTS} attempts: ${lastError}`
    );

    throw new WorkflowPlanningFailedError();
  }
}

// Derived from the shared EXECUTABLE_OPERATIONS list (see
// backend/src/constants/workflow-operations.ts) so the prompt can never list
// an operation the Zod schema below it (and the execution engine) wouldn't
// also accept. Passed as invoke() input (rendered into the Brain's prompt
// via {{operationCatalog}}/{{allowedOperationsLine}}) rather than baked into
// the seeded prompt text, so this stays in sync with the constant even if
// the seed is never re-run.
const OPERATION_CATALOG = EXECUTABLE_OPERATIONS.map(
  ({ operation, description }) => `${operation} — ${description}`
).join("\n");

const ALLOWED_OPERATIONS_LINE = `You may ONLY generate these operations: ${EXECUTABLE_OPERATION_NAMES.join(", ")}. Generating any other operation is forbidden.`;

type ParseResult = { success: true; workflow: Workflow } | { success: false; error: string };

// invokeResult.outcome is only ever VALID or SCHEMA_INVALID by the time this
// runs — TRANSIENT_FAILURE/DEFINITIVE_FAILURE are handled (thrown) before
// parseWorkflow() is called. AI Core's own extractJson() already strips
// markdown fences before attempting JSON.parse, same as the old local
// helper did.
function parseWorkflow(invokeResult: AiInvokeResult): ParseResult {
  if (invokeResult.outcome === "SCHEMA_INVALID") {
    return { success: false, error: "The AI response was not valid JSON." };
  }

  const result = WorkflowSchema.safeParse(invokeResult.outputJson);

  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".");
    const message = issue?.message ?? "The AI response did not match the expected workflow format.";
    return { success: false, error: path ? `${path}: ${message}` : message };
  }

  return { success: true, workflow: result.data };
}

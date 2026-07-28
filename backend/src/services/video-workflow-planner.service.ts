import { VideoAssetRepository } from "../repositories/video-asset.repository.js";
import { VideoWorkflowPlanRepository } from "../repositories/video-workflow-plan.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { ChatService } from "./chat.service.js";
import type { OllamaMessage } from "../providers/interfaces/ai-provider.js";
import { NotFoundError } from "../errors/auth.error.js";
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

// Sprint 7.2.2 — Workflow Planner only: turns a natural-language editing
// request into a validated, structured plan. Never executes it — that's
// the Execution Engine's job (Sprint 7.2.3+, a deliberately separate
// milestone per the approved architecture). No new AI abstraction: this
// calls ChatService directly, the same precedent VideoAssetService's text
// kinds already set (see ADR-0001 — this hardware has no room for a
// second, separate "planner model").
export class VideoWorkflowPlannerService {
  constructor(
    private readonly videoAssetRepository = new VideoAssetRepository(),
    private readonly workflowPlanRepository = new VideoWorkflowPlanRepository(),
    private readonly chatService = new ChatService(),
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

    const messages: OllamaMessage[] = [
      { role: "system", content: buildPlannerSystemPrompt(videoAsset) },
      { role: "user", content: data.prompt },
    ];

    let lastError = "The AI did not return a response.";
    let modelUsed: string | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const response = await this.chatService.chat(messages);
      modelUsed = response.model;

      const result = parseWorkflow(response.response);

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
      // exact validation error and ask for a fixed, pure-JSON response.
      messages.push(
        { role: "assistant", content: response.response },
        {
          role: "user",
          content: `Your previous response was invalid: ${lastError}\n\nRespond again with ONLY the corrected JSON object. No markdown, no explanations, no code fences.`,
        }
      );
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
// also accept.
const OPERATION_CATALOG = EXECUTABLE_OPERATIONS.map(
  ({ operation, description }) => `${operation} — ${description}`
).join("\n");

const ALLOWED_OPERATIONS_LINE = `You may ONLY generate these operations: ${EXECUTABLE_OPERATION_NAMES.join(", ")}. Generating any other operation is forbidden.`;

function buildPlannerSystemPrompt(videoAsset: {
  durationMs: number | null;
  width: number | null;
  height: number | null;
  videoFormat: string | null;
}): string {
  return `You are a video editing planner. Convert the user's natural-language request into a JSON editing plan.

Source video metadata:
- duration: ${videoAsset.durationMs ?? "unknown"} ms
- resolution: ${videoAsset.width ?? "unknown"}x${videoAsset.height ?? "unknown"}
- format: ${videoAsset.videoFormat ?? "unknown"}

You may ONLY use these operations, each with exactly these parameters:
${OPERATION_CATALOG}

${ALLOWED_OPERATIONS_LINE}

Output ONLY a JSON object of this exact shape, and nothing else:
{"steps":[{"operation":"<one of the operations above>","params":{...}}]}

Rules:
- Output ONLY valid JSON. No markdown. No explanations. No prose. No code fences.
- Only use operations from the list above. Never invent a new operation.
- Only include the parameters listed for that operation. Never add extra parameters.
- Order the steps in a sensible execution order.`;
}

type ParseResult = { success: true; workflow: Workflow } | { success: false; error: string };

// Local LLMs frequently wrap JSON in a markdown code fence despite explicit
// instructions not to — stripped defensively before parsing, since this is
// about correctly reading the existing single ChatService response, not
// new functionality.
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function parseWorkflow(raw: string): ParseResult {
  let json: unknown;

  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    return { success: false, error: "The AI response was not valid JSON." };
  }

  const result = WorkflowSchema.safeParse(json);

  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".");
    const message = issue?.message ?? "The AI response did not match the expected workflow format.";
    return { success: false, error: path ? `${path}: ${message}` : message };
  }

  return { success: true, workflow: result.data };
}

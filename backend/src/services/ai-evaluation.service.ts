import {
  aiEvaluationRepository,
  AiEvaluationRepository,
} from "../repositories/ai-evaluation.repository.js";
import { aiPromptRepository, AiPromptRepository } from "../repositories/ai-prompt.repository.js";
import { aiBrainRepository, AiBrainRepository } from "../repositories/ai-brain.repository.js";
import { aiRoutingService, AiRoutingService } from "./ai-routing.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AiEvaluation } from "../generated/prisma/client.js";

export interface RunEvaluationInput {
  promptId: string;
  testCaseName: string;
  input: Record<string, unknown>;
  expectedShape?: Record<string, unknown>;
}

// Runs one stored test case against a specific (not necessarily active)
// prompt version via the Playground path (promptVersion override), so
// evaluating a candidate version never touches the Brain's actual active
// prompt (TDD §10: "the Prompt Library page's Evaluate action... is one of
// the two intended ways to validate a candidate prompt version before
// flipping isActive"). expectedShape is checked structurally (top-level key
// presence), not full JSON-schema validation — deliberately lightweight,
// matching §5's own description of this field.
export class AiEvaluationService {
  constructor(
    private readonly repository: AiEvaluationRepository = aiEvaluationRepository,
    private readonly promptRepository: AiPromptRepository = aiPromptRepository,
    private readonly brainRepository: AiBrainRepository = aiBrainRepository,
    private readonly routingService: AiRoutingService = aiRoutingService
  ) {}

  async run(data: RunEvaluationInput, actorId: string): Promise<AiEvaluation> {
    const prompt = await this.promptRepository.findById(data.promptId);
    if (!prompt) {
      throw new NotFoundError("Prompt version not found.");
    }

    const brain = await this.brainRepository.findById(prompt.brainId);
    if (!brain) {
      throw new NotFoundError("Brain not found for this prompt.");
    }

    const result = await this.routingService.invokePlayground({
      brainKey: brain.key,
      input: data.input,
      overrides: { promptVersion: prompt.version },
      actorId,
    });

    const passed = result.outcome === "VALID" && matchesShape(result.outputJson, data.expectedShape);

    return this.repository.create({
      promptId: data.promptId,
      testCaseName: data.testCaseName,
      input: data.input,
      expectedShape: data.expectedShape ?? null,
      actualOutput: isRecord(result.outputJson) ? result.outputJson : { text: result.output },
      passed,
      score: passed ? 1 : 0,
    });
  }

  async listByPrompt(promptId: string): Promise<AiEvaluation[]> {
    return this.repository.listByPrompt(promptId);
  }
}

export const aiEvaluationService = new AiEvaluationService();

function matchesShape(actual: unknown, expected?: Record<string, unknown>): boolean {
  if (!expected) return true;
  if (!isRecord(actual)) return false;
  return Object.keys(expected).every((key) => key in actual);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import {
  aiPromptRepository,
  AiPromptRepository,
  type CreateAiPromptData,
} from "../repositories/ai-prompt.repository.js";
import { aiAuditService, AiAuditService } from "./ai-audit.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import { ApiError } from "../errors/api-error.js";
import type { AiPrompt } from "../generated/prisma/client.js";

// Additive-only (ADR-0020 Decision 2, enforced here — not the DB, per §5's
// comment on AiPrompt.isActive): create() always inserts a new version,
// never updates an existing one's body. activate() is the only way a
// version becomes current, and it is a transaction (deactivate all,
// activate one) so exactly one active version per Brain always holds.
export class AiPromptService {
  constructor(
    private readonly repository: AiPromptRepository = aiPromptRepository,
    private readonly auditService: AiAuditService = aiAuditService
  ) {}

  async createVersion(data: CreateAiPromptData, actorId: string): Promise<AiPrompt> {
    const existing = await this.repository.findByBrainAndVersion(data.brainId, data.version);
    if (existing) {
      throw new ApiError(409, `Prompt version "${data.version}" already exists for this Brain.`);
    }

    const prompt = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "PROMPT_VERSION_CREATED",
      targetType: "AiPrompt",
      targetId: prompt.id,
      metadata: { brainId: data.brainId, version: data.version },
    });

    return prompt;
  }

  // Also how a "rollback" happens — activating an older version is the same
  // operation as activating a new one (§5's comment: "no delete needed").
  // PROMPT_VERSION_ROLLED_BACK is reserved for a future UI affordance that
  // can tell the two apart (e.g. "activate a version older than current");
  // Phase 1 always records PROMPT_VERSION_ACTIVATED, the same posture this
  // schema already takes with other reserved-but-unused enum values (e.g.
  // AiMemoryStrategy.RAG).
  async activate(brainId: string, promptId: string, actorId: string): Promise<void> {
    const prompt = await this.repository.findById(promptId);
    if (!prompt || prompt.brainId !== brainId) {
      throw new NotFoundError("Prompt version not found for this Brain.");
    }

    await this.repository.activate(brainId, promptId);

    await this.auditService.record({
      actorId,
      action: "PROMPT_VERSION_ACTIVATED",
      targetType: "AiPrompt",
      targetId: promptId,
      metadata: { brainId, version: prompt.version },
    });
  }

  async listByBrain(brainId: string): Promise<AiPrompt[]> {
    return this.repository.listByBrain(brainId);
  }

  async getActiveByBrain(brainId: string): Promise<AiPrompt | null> {
    return this.repository.findActiveByBrain(brainId);
  }
}

export const aiPromptService = new AiPromptService();

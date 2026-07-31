import {
  aiModelRepository,
  AiModelRepository,
  type CreateAiModelData,
  type UpdateAiModelData,
} from "../repositories/ai-model.repository.js";
import { aiAuditService, AiAuditService } from "./ai-audit.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AiModel } from "../generated/prisma/client.js";

export class AiModelService {
  constructor(
    private readonly repository: AiModelRepository = aiModelRepository,
    private readonly auditService: AiAuditService = aiAuditService
  ) {}

  async create(data: CreateAiModelData, actorId: string): Promise<AiModel> {
    const model = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "MODEL_CREATED",
      targetType: "AiModel",
      targetId: model.id,
      metadata: { providerId: model.providerId, modelKey: model.modelKey },
    });

    return model;
  }

  async update(id: string, data: UpdateAiModelData, actorId: string): Promise<AiModel> {
    await this.getOrThrow(id);
    const updated = await this.repository.update(id, data);

    await this.auditService.record({
      actorId,
      action: "MODEL_UPDATED",
      targetType: "AiModel",
      targetId: id,
    });

    return updated;
  }

  async delete(id: string, actorId: string): Promise<void> {
    await this.getOrThrow(id);
    await this.repository.delete(id);

    await this.auditService.record({
      actorId,
      action: "MODEL_DELETED",
      targetType: "AiModel",
      targetId: id,
    });
  }

  async getById(id: string): Promise<AiModel> {
    return this.getOrThrow(id);
  }

  async list(): Promise<AiModel[]> {
    return this.repository.findAll();
  }

  async listByProvider(providerId: string): Promise<AiModel[]> {
    return this.repository.findByProvider(providerId);
  }

  private async getOrThrow(id: string): Promise<AiModel> {
    const model = await this.repository.findById(id);
    if (!model) {
      throw new NotFoundError("AI Core model not found.");
    }
    return model;
  }
}

export const aiModelService = new AiModelService();

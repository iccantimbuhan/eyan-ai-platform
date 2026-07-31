import {
  aiBrainRepository,
  AiBrainRepository,
  type CreateAiBrainData,
  type UpdateAiBrainData,
} from "../repositories/ai-brain.repository.js";
import { aiAuditService, AiAuditService } from "./ai-audit.service.js";
import { aiRoutingService, AiRoutingService, type AiInvokeContext, type AiInvokeResult } from "./ai-routing.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AiBrain } from "../generated/prisma/client.js";

// invokeBrain() is administrative/Playground-only — gated at the route
// layer by requirePermission("aicoreadmin") (§6, §15). Business-module
// traffic must go through AiCapabilityService.invoke() instead; this
// service never exposes a lighter-permission path to the same call.
export class AiBrainService {
  constructor(
    private readonly repository: AiBrainRepository = aiBrainRepository,
    private readonly auditService: AiAuditService = aiAuditService,
    private readonly routingService: AiRoutingService = aiRoutingService
  ) {}

  async invoke(
    brainKey: string,
    input: Record<string, unknown>,
    context: AiInvokeContext,
    actorId: string | null
  ): Promise<AiInvokeResult> {
    return this.routingService.invokeBrain(brainKey, input, context, actorId);
  }

  async create(data: CreateAiBrainData, actorId: string): Promise<AiBrain> {
    const brain = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "BRAIN_CREATED",
      targetType: "AiBrain",
      targetId: brain.id,
      metadata: { key: brain.key },
    });

    return brain;
  }

  async update(id: string, data: UpdateAiBrainData, actorId: string): Promise<AiBrain> {
    await this.getOrThrow(id);
    const updated = await this.repository.update(id, data);

    await this.auditService.record({
      actorId,
      action: "BRAIN_UPDATED",
      targetType: "AiBrain",
      targetId: id,
    });

    return updated;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const brain = await this.getOrThrow(id);
    await this.repository.delete(id);

    await this.auditService.record({
      actorId,
      action: "BRAIN_DELETED",
      targetType: "AiBrain",
      targetId: id,
      metadata: { key: brain.key },
    });
  }

  async getById(id: string): Promise<AiBrain> {
    return this.getOrThrow(id);
  }

  async list(): Promise<AiBrain[]> {
    return this.repository.findAll();
  }

  private async getOrThrow(id: string): Promise<AiBrain> {
    const brain = await this.repository.findById(id);
    if (!brain) {
      throw new NotFoundError("AI Brain not found.");
    }
    return brain;
  }
}

export const aiBrainService = new AiBrainService();

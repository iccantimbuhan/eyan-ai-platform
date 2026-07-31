import {
  aiCapabilityRepository,
  AiCapabilityRepository,
  type CreateAiCapabilityData,
  type UpdateAiCapabilityData,
} from "../repositories/ai-capability.repository.js";
import { aiAuditService, AiAuditService } from "./ai-audit.service.js";
import { aiRoutingService, AiRoutingService, type AiInvokeContext, type AiInvokeResult } from "./ai-routing.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AiCapability } from "../generated/prisma/client.js";

// The one call surface every business module and n8n workflow uses
// (architecture frozen — see ADR-0021): invoke() resolves the Capability to
// its Brain and delegates execution to AiRoutingService. CRUD here is
// otherwise a thin orchestrator, same shape as McpServerConfigService.
export class AiCapabilityService {
  constructor(
    private readonly repository: AiCapabilityRepository = aiCapabilityRepository,
    private readonly auditService: AiAuditService = aiAuditService,
    private readonly routingService: AiRoutingService = aiRoutingService
  ) {}

  async invoke(
    capabilityKey: string,
    input: Record<string, unknown>,
    context: AiInvokeContext,
    actorId: string | null
  ): Promise<AiInvokeResult> {
    return this.routingService.invokeCapability(capabilityKey, input, context, actorId);
  }

  async create(data: CreateAiCapabilityData, actorId: string): Promise<AiCapability> {
    const capability = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "CAPABILITY_CREATED",
      targetType: "AiCapability",
      targetId: capability.id,
      metadata: { key: capability.key, brainId: capability.brainId },
    });

    return capability;
  }

  async update(id: string, data: UpdateAiCapabilityData, actorId: string): Promise<AiCapability> {
    await this.getOrThrow(id);
    const updated = await this.repository.update(id, data);

    await this.auditService.record({
      actorId,
      action: "CAPABILITY_UPDATED",
      targetType: "AiCapability",
      targetId: id,
    });

    return updated;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const capability = await this.getOrThrow(id);
    await this.repository.delete(id);

    await this.auditService.record({
      actorId,
      action: "CAPABILITY_DELETED",
      targetType: "AiCapability",
      targetId: id,
      metadata: { key: capability.key },
    });
  }

  async getById(id: string): Promise<AiCapability> {
    return this.getOrThrow(id);
  }

  async list(): Promise<AiCapability[]> {
    return this.repository.findAll();
  }

  private async getOrThrow(id: string): Promise<AiCapability> {
    const capability = await this.repository.findById(id);
    if (!capability) {
      throw new NotFoundError("AI Capability not found.");
    }
    return capability;
  }
}

export const aiCapabilityService = new AiCapabilityService();

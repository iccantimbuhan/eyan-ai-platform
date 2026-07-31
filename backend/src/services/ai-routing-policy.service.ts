import {
  aiRoutingPolicyRepository,
  AiRoutingPolicyRepository,
  type CreateAiRoutingPolicyData,
} from "../repositories/ai-routing-policy.repository.js";
import { aiAuditService, AiAuditService } from "./ai-audit.service.js";
import { NotFoundError } from "../errors/auth.error.js";
import type { AiRoutingPolicy } from "../generated/prisma/client.js";

// Same additive-versioned, transaction-backed activation shape as
// AiPromptService.
export class AiRoutingPolicyService {
  constructor(
    private readonly repository: AiRoutingPolicyRepository = aiRoutingPolicyRepository,
    private readonly auditService: AiAuditService = aiAuditService
  ) {}

  async create(data: CreateAiRoutingPolicyData, actorId: string): Promise<AiRoutingPolicy> {
    const policy = await this.repository.create(data);

    await this.auditService.record({
      actorId,
      action: "ROUTING_POLICY_CHANGED",
      targetType: "AiRoutingPolicy",
      targetId: policy.id,
      metadata: { brainId: data.brainId, created: true },
    });

    return policy;
  }

  async activate(brainId: string, policyId: string, actorId: string): Promise<void> {
    const policy = await this.repository.findById(policyId);
    if (!policy || policy.brainId !== brainId) {
      throw new NotFoundError("Routing policy not found for this Brain.");
    }

    await this.repository.activate(brainId, policyId);

    await this.auditService.record({
      actorId,
      action: "ROUTING_POLICY_CHANGED",
      targetType: "AiRoutingPolicy",
      targetId: policyId,
      metadata: { brainId, activated: true },
    });
  }

  async listByBrain(brainId: string): Promise<AiRoutingPolicy[]> {
    return this.repository.listByBrain(brainId);
  }

  async getActiveByBrain(brainId: string) {
    return this.repository.findActiveByBrain(brainId);
  }
}

export const aiRoutingPolicyService = new AiRoutingPolicyService();

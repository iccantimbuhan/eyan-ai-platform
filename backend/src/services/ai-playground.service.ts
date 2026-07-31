import { aiRoutingService, AiRoutingService, type AiInvokeOverrides, type AiInvokeResult } from "./ai-routing.service.js";
import { aiUsageService, AiUsageService } from "./ai-usage.service.js";

export interface PlaygroundInvokeInput {
  capabilityKey?: string;
  brainKey?: string;
  input: Record<string, unknown>;
  overrides?: AiInvokeOverrides;
}

// Thin wrapper around AiRoutingService.invokePlayground() — see TDD §13.
// Isolation from production (no persisted override, domain-tagged usage
// logging) is enforced entirely inside AiRoutingService/AiUsageService;
// this service exists only so the controller has a single, named entry
// point matching every other AI Core resource's Controller -> Service
// layering.
export class AiPlaygroundService {
  constructor(
    private readonly routingService: AiRoutingService = aiRoutingService,
    private readonly usageService: AiUsageService = aiUsageService
  ) {}

  async invoke(data: PlaygroundInvokeInput, actorId: string): Promise<AiInvokeResult> {
    return this.routingService.invokePlayground({ ...data, actorId });
  }

  async history(page = 1, pageSize = 20) {
    return this.usageService.listPlaygroundHistory(page, pageSize);
  }
}

export const aiPlaygroundService = new AiPlaygroundService();

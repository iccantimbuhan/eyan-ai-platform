import { prisma } from "../lib/prisma.js";
import type {
  EstimatedTimeline,
  LeadPriority,
  QualificationLevel,
} from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateLeadAiAnalysisData {
  leadId: string;
  provider: string;
  model: string;
  promptVersion: string;
  leadScore: number;
  confidence: number;
  priority: LeadPriority;
  industry?: string | null;
  companySizeEstimate?: string | null;
  budgetEstimateMin?: number | null;
  budgetEstimateMax?: number | null;
  budgetEstimateCurrency?: string | null;
  buyingIntent?: QualificationLevel | null;
  urgency?: QualificationLevel | null;
  decisionMakerIdentified?: boolean | null;
  estimatedTimeline?: EstimatedTimeline | null;
  riskLevel?: QualificationLevel | null;
  painPoints?: string[];
  recommendedAction: string;
  summary: string;
  reasoning: string;
  rawResponse: Prisma.InputJsonValue;
  needsManualReview?: boolean;
}

export class CrmAiAnalysisRepository {
  async create(data: CreateLeadAiAnalysisData) {
    return prisma.leadAiAnalysis.create({ data });
  }
}

export const crmAiAnalysisRepository = new CrmAiAnalysisRepository();

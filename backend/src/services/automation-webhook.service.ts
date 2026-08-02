import axios from "axios";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { signAutomationPayload } from "../utils/automation-signature.js";
import type { Lead } from "../generated/prisma/client.js";
import type { ApplyQualificationResultDto } from "../dto/crm-automation.dto.js";

const CONTRACT_VERSION = "1";

interface LeadIntakeWebhookPayload {
  contractVersion: string;
  event: "lead.created";
  lead: {
    id: string;
    contactName: string;
    email: string;
    phone: string | null;
    company: string | null;
    industry: string | null;
    companySize: string | null;
    source: string;
    createdAt: string;
  };
}

// Phase 6 (Sprint 5) — Workflow 4's trigger. Sent only after the CRM has
// already fully applied the qualification result (pipeline stage, Activity)
// — this is a notification of a finished state change, not a request for
// n8n to compute or move anything, matching "n8n orchestrates, CRM decides."
interface LeadQualifiedWebhookPayload {
  contractVersion: string;
  event: "lead.qualified";
  lead: {
    id: string;
    contactName: string;
    email: string;
    company: string | null;
    assignedToId: string | null;
  };
  qualification: {
    score: number;
    confidenceTier: string | null;
    confidenceScore: number;
    priority: string;
    buyingIntent: string | null;
    urgency: string | null;
    recommendedAction: string;
    summary: string;
    painPoints: string[];
    estimatedTimeline: string | null;
    needsManualReview: boolean;
  };
  pipelineStage: string;
}

// ADR-0019 — dispatches Workflow 1's trigger (eyan-automation-hub, not built
// this sprint). Deliberately named at the platform level, not
// crm-lead-specific, even though CRM lead creation is its only caller today
// (ADR-0018 Decision 6) — a future automation domain adds its own event,
// not its own dispatcher.
export class AutomationWebhookService {
  private readonly client = axios.create({
    timeout: env.automationWebhookTimeout,
  });

  // Fire-and-forget by design (TDD NFR: the Lead Form response must return
  // immediately) — callers must not await this on the request path; a
  // failure here is logged, never thrown, so it can never surface as a 500
  // on lead creation.
  async dispatchLeadIntake(lead: Lead): Promise<void> {
    if (!env.automationHubWebhookUrl) {
      logger.debug(
        "[AutomationWebhookService] Skipping lead-intake dispatch — Automation Hub not configured."
      );
      return;
    }

    const payload: LeadIntakeWebhookPayload = {
      contractVersion: CONTRACT_VERSION,
      event: "lead.created",
      lead: {
        id: lead.id,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        industry: lead.industry,
        companySize: lead.companySize,
        source: lead.source,
        createdAt: lead.createdAt.toISOString(),
      },
    };

    await this.postSigned(env.automationHubWebhookUrl, payload, `lead-intake dispatch for lead ${lead.id}`);
  }

  // Phase 6 (Sprint 5) — Workflow 4's trigger, fired once CrmAutomationIngestService
  // has fully persisted the qualification result (LeadAiAnalysis, pipeline
  // stage, Activities). Same fire-and-forget/HMAC pattern as dispatchLeadIntake
  // — a failed dispatch must never surface as a failure of the write-back
  // that produced it.
  async dispatchLeadQualified(
    lead: Lead,
    analysis: ApplyQualificationResultDto,
    pipelineStage: string
  ): Promise<void> {
    if (!env.automationHubLeadQualifiedWebhookUrl) {
      logger.debug(
        "[AutomationWebhookService] Skipping lead-qualified dispatch — Automation Hub not configured."
      );
      return;
    }

    const payload: LeadQualifiedWebhookPayload = {
      contractVersion: CONTRACT_VERSION,
      event: "lead.qualified",
      lead: {
        id: lead.id,
        contactName: lead.contactName,
        email: lead.email,
        company: lead.company,
        assignedToId: lead.assignedToId,
      },
      qualification: {
        score: analysis.leadScore,
        confidenceTier: analysis.confidenceTier ?? null,
        confidenceScore: analysis.confidence,
        priority: analysis.priority,
        buyingIntent: analysis.buyingIntent ?? null,
        urgency: analysis.urgency ?? null,
        recommendedAction: analysis.recommendedAction,
        summary: analysis.summary,
        painPoints: analysis.painPoints ?? [],
        estimatedTimeline: analysis.estimatedTimeline ?? null,
        needsManualReview: analysis.needsManualReview ?? false,
      },
      pipelineStage,
    };

    await this.postSigned(
      env.automationHubLeadQualifiedWebhookUrl,
      payload,
      `lead-qualified dispatch for lead ${lead.id}`
    );
  }

  private async postSigned(url: string, payload: unknown, label: string): Promise<void> {
    if (!env.automationWebhookSigningSecret) {
      logger.debug(`[AutomationWebhookService] Skipping ${label} — signing secret not configured.`);
      return;
    }

    const rawBody = JSON.stringify(payload);
    const timestampMs = Date.now();
    const signature = signAutomationPayload(
      rawBody,
      timestampMs,
      env.automationWebhookSigningSecret
    );

    try {
      await this.client.post(url, rawBody, {
        headers: {
          "Content-Type": "application/json",
          "X-Eyan-Signature": `sha256=${signature}`,
          "X-Eyan-Timestamp": String(timestampMs),
        },
      });
    } catch (error) {
      logger.error(`[AutomationWebhookService] ${label} failed:`, error);
    }
  }
}

export const automationWebhookService = new AutomationWebhookService();

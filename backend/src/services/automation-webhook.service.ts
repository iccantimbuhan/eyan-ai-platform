import axios from "axios";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { signAutomationPayload } from "../utils/automation-signature.js";
import type { Lead } from "../generated/prisma/client.js";

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
    if (!env.automationHubWebhookUrl || !env.automationWebhookSigningSecret) {
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

    const rawBody = JSON.stringify(payload);
    const timestampMs = Date.now();
    const signature = signAutomationPayload(
      rawBody,
      timestampMs,
      env.automationWebhookSigningSecret
    );

    try {
      await this.client.post(env.automationHubWebhookUrl, rawBody, {
        headers: {
          "Content-Type": "application/json",
          "X-Eyan-Signature": `sha256=${signature}`,
          "X-Eyan-Timestamp": String(timestampMs),
        },
      });
    } catch (error) {
      logger.error(
        `[AutomationWebhookService] Lead-intake dispatch failed for lead ${lead.id}:`,
        error
      );
    }
  }
}

export const automationWebhookService = new AutomationWebhookService();

import type { Request, Response } from "express";

import { CrmAutomationIngestService } from "../services/crm-automation-ingest.service.js";
import { ApiResponse } from "../utils/api-response.js";

const crmAutomationIngestService = new CrmAutomationIngestService();

export class CrmAutomationController {
  private static getId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  // Workflow 2's dedupe check — a miss is a normal outcome (200, `lead: null`),
  // not a 404: "no existing lead for this email" is the expected common case.
  static async findByEmail(req: Request, res: Response) {
    const lead = await crmAutomationIngestService.findByEmail(
      req.query.email as string
    );

    return ApiResponse.success(res, { lead }, 200, "Lookup complete.");
  }

  static async applyValidationResult(req: Request, res: Response) {
    const lead = await crmAutomationIngestService.applyValidationResult(
      CrmAutomationController.getId(req),
      req.body
    );

    return ApiResponse.success(res, lead, 200, "Validation result applied.");
  }

  static async applyQualificationResult(req: Request, res: Response) {
    const lead = await crmAutomationIngestService.applyQualificationResult(
      CrmAutomationController.getId(req),
      req.body
    );

    return ApiResponse.success(res, lead, 200, "Qualification result applied.");
  }

  static async assignLead(req: Request, res: Response) {
    const lead = await crmAutomationIngestService.assignLead(
      CrmAutomationController.getId(req),
      req.body
    );

    return ApiResponse.success(res, lead, 200, "Lead assigned.");
  }
}

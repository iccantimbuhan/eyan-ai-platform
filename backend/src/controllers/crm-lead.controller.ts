import type { Request, Response } from "express";

import { CrmLeadService } from "../services/crm-lead.service.js";
import { ApiResponse } from "../utils/api-response.js";

const crmLeadService = new CrmLeadService();

export class CrmLeadController {
  private static getId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  static async create(req: Request, res: Response) {
    const lead = await crmLeadService.create(req.body);

    return ApiResponse.success(res, lead, 201, "Lead received.");
  }

  static async list(req: Request, res: Response) {
    const result = await crmLeadService.list({
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      status: req.query.status as never,
      priority: req.query.priority as never,
      assignedToId: req.query.assignedToId?.toString(),
      search: req.query.search?.toString(),
      sortBy: req.query.sortBy as never,
      sortDir: req.query.sortDir as never,
    });

    return ApiResponse.paginated(
      res,
      result.items,
      result.pagination,
      200,
      "Leads retrieved successfully."
    );
  }

  static async getOne(req: Request, res: Response) {
    const lead = await crmLeadService.getById(CrmLeadController.getId(req));

    return ApiResponse.success(res, lead, 200, "Lead retrieved successfully.");
  }

  static async update(req: Request, res: Response) {
    const lead = await crmLeadService.update(CrmLeadController.getId(req), req.body);

    return ApiResponse.success(res, lead, 200, "Lead updated successfully.");
  }

  static async updateStatus(req: Request, res: Response) {
    const lead = await crmLeadService.updateStatus(
      CrmLeadController.getId(req),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, lead, 200, "Lead status updated successfully.");
  }

  static async assign(req: Request, res: Response) {
    const lead = await crmLeadService.assign(
      CrmLeadController.getId(req),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, lead, 200, "Lead assignment updated successfully.");
  }

  static async addNote(req: Request, res: Response) {
    const lead = await crmLeadService.addNote(
      CrmLeadController.getId(req),
      req.body,
      req.user.id
    );

    return ApiResponse.success(res, lead, 201, "Note added successfully.");
  }
}

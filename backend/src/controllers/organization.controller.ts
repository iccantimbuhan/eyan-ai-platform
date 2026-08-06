import type { Request, Response } from "express";

import { organizationService } from "../services/organization.service.js";
import { ApiResponse } from "../utils/api-response.js";

export class OrganizationController {
  static async getTenantContext(req: Request, res: Response) {
    const context = await organizationService.getTenantContextForUser(
      req.user.id
    );

    return ApiResponse.success(
      res,
      context,
      200,
      "Tenant context retrieved successfully."
    );
  }
}

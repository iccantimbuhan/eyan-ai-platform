import type { Request, Response } from "express";

import { staffMembershipService } from "../services/staff-membership.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class StaffMembershipController {
  static async listForOrganization(req: Request, res: Response) {
    const staff = await staffMembershipService.listForOrganization(
      getParam(req, "organizationId")
    );

    return ApiResponse.success(res, staff, 200, "Staff retrieved successfully.");
  }

  static async listForRestaurant(req: Request, res: Response) {
    const staff = await staffMembershipService.listForRestaurant(getParam(req, "restaurantId"));

    return ApiResponse.success(res, staff, 200, "Staff retrieved successfully.");
  }

  static async upsertForOrganization(req: Request, res: Response) {
    const staff = await staffMembershipService.upsertMembership(
      getParam(req, "organizationId"),
      req.body
    );

    return ApiResponse.success(res, staff, 200, "Staff membership saved successfully.");
  }

  static async upsertForRestaurant(req: Request, res: Response) {
    const staff = await staffMembershipService.upsertMembershipUnderRestaurant(
      getParam(req, "restaurantId"),
      req.body
    );

    return ApiResponse.success(res, staff, 200, "Staff membership saved successfully.");
  }

  static async revokeFromOrganization(req: Request, res: Response) {
    await staffMembershipService.revokeFromOrganization(
      getParam(req, "userId"),
      getParam(req, "organizationId")
    );

    return ApiResponse.success(res, null, 200, "Staff member disabled successfully.");
  }

  static async revokeFromRestaurant(req: Request, res: Response) {
    await staffMembershipService.revokeFromRestaurant(
      getParam(req, "userId"),
      getParam(req, "restaurantId")
    );

    return ApiResponse.success(res, null, 200, "Staff member disabled successfully.");
  }
}

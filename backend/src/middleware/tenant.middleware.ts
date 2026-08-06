import type { NextFunction, Request, Response } from "express";

import { restaurantRepository } from "../repositories/restaurant.repository.js";
import { branchRepository } from "../repositories/branch.repository.js";

// Express 5's ParamsDictionary allows string[] for wildcard/repeated
// segments; every route this middleware guards uses a single named
// segment, so the first value is always the whole match.
function getParam(req: Request, paramName: string): string | undefined {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

function hasOrganizationAccess(req: Request, organizationId: string): boolean {
  return req.user.organizationMemberships.some(
    (membership) => membership.organizationId === organizationId
  );
}

function hasDirectRestaurantAccess(req: Request, restaurantId: string): boolean {
  return req.user.restaurantMemberships.some(
    (membership) => membership.restaurantId === restaurantId
  );
}

// Sprint 0 (ADR-0025). Composes alongside requirePermission the same way
// every existing route already stacks authenticate + requirePermission:
// requirePermission gates whether a user can use the Restaurant module at
// all; this gates *which* Restaurant they can act on within it. Access is
// granted either by a direct RestaurantMember row, or by OrganizationMember
// on the Restaurant's parent Organization.
export function requireRestaurantAccess(paramName = "restaurantId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const restaurantId = getParam(req, paramName);

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: `Missing route parameter "${paramName}".`,
      });
    }

    if (hasDirectRestaurantAccess(req, restaurantId)) {
      return next();
    }

    const restaurant = await restaurantRepository.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
      });
    }

    if (hasOrganizationAccess(req, restaurant.organizationId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this restaurant.",
    });
  };
}

// Same posture as requireRestaurantAccess, one level down: a Branch is
// reachable either via a RestaurantMember on its parent Restaurant, or via
// OrganizationMember on that Restaurant's parent Organization. Branch-level
// membership is deliberately not modeled yet (YAGNI, see ADR-0025).
export function requireBranchAccess(paramName = "branchId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const branchId = getParam(req, paramName);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: `Missing route parameter "${paramName}".`,
      });
    }

    const branch = await branchRepository.findById(branchId);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    if (hasDirectRestaurantAccess(req, branch.restaurantId)) {
      return next();
    }

    const restaurant = await restaurantRepository.findById(branch.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
      });
    }

    if (hasOrganizationAccess(req, restaurant.organizationId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this branch.",
    });
  };
}

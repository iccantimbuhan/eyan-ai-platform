import type { NextFunction, Request, Response } from "express";

import type { TenantRole } from "../generated/prisma/enums.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { restaurantRepository } from "../repositories/restaurant.repository.js";
import { branchRepository } from "../repositories/branch.repository.js";
import { menuCategoryRepository } from "../repositories/menu-category.repository.js";
import { menuItemRepository } from "../repositories/menu-item.repository.js";
import { unitRepository } from "../repositories/unit.repository.js";
import { ingredientCategoryRepository } from "../repositories/ingredient-category.repository.js";
import { supplierRepository } from "../repositories/supplier.repository.js";
import { ingredientRepository } from "../repositories/ingredient.repository.js";
import { recipeRepository } from "../repositories/recipe.repository.js";
import { recipeIngredientRepository } from "../repositories/recipe-ingredient.repository.js";

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

function hasDirectBranchAccess(req: Request, branchId: string): boolean {
  return req.user.branchMemberships.some((membership) => membership.branchId === branchId);
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
      req.tenantContext = { ...req.tenantContext, restaurantId };
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
      req.tenantContext = {
        ...req.tenantContext,
        restaurantId,
        organizationId: restaurant.organizationId,
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this restaurant.",
    });
  };
}

// A Branch is reachable via a direct BranchMember row (Sprint 1.2,
// ADR-0036 — the real need ADR-0025 deferred this on), or, failing that,
// via a RestaurantMember on its parent Restaurant, or via OrganizationMember
// on that Restaurant's parent Organization.
export function requireBranchAccess(paramName = "branchId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const branchId = getParam(req, paramName);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: `Missing route parameter "${paramName}".`,
      });
    }

    if (hasDirectBranchAccess(req, branchId)) {
      // branch.restaurantId still needs resolving for requireTenantRole's
      // "RestaurantMember overrides OrganizationMember" fallback — but only
      // if a caller composes requireTenantRole after this on a route where
      // the direct BranchMember row's own role isn't already sufficient.
      // Resolving it here would cost a query on every branch-member request
      // even when unnecessary, so it's deliberately left unresolved; a
      // direct BranchMember match is authoritative on its own.
      req.tenantContext = { ...req.tenantContext, branchId };
      return next();
    }

    const branch = await branchRepository.findById(branchId);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    if (hasDirectRestaurantAccess(req, branch.restaurantId)) {
      req.tenantContext = {
        ...req.tenantContext,
        branchId,
        restaurantId: branch.restaurantId,
      };
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
      req.tenantContext = {
        ...req.tenantContext,
        branchId,
        restaurantId: branch.restaurantId,
        organizationId: restaurant.organizationId,
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this branch.",
    });
  };
}

// Sprint 1.1 — guards the one route that sits above Restaurant in the
// hierarchy (creating/listing Restaurants under an Organization). No
// "direct" tier exists here the way requireRestaurantAccess/
// requireBranchAccess have one: OrganizationMember is itself the top of
// the chain, so this is a single membership check plus an existence check
// for a correct 404 vs 403 distinction.
export function requireOrganizationAccess(paramName = "organizationId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const organizationId = getParam(req, paramName);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: `Missing route parameter "${paramName}".`,
      });
    }

    if (hasOrganizationAccess(req, organizationId)) {
      req.tenantContext = { ...req.tenantContext, organizationId };
      return next();
    }

    const organization = await organizationRepository.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this organization.",
    });
  };
}

// Same posture as requireBranchAccess: MenuCategory is Restaurant-scoped
// (not Branch-scoped, per .context/restaurant.md), so access is resolved
// via the category's own restaurantId, then the usual direct-Restaurant-
// membership-or-parent-Organization-membership check.
export function requireMenuCategoryAccess(paramName = "categoryId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const categoryId = getParam(req, paramName);

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: `Missing route parameter "${paramName}".`,
      });
    }

    const category = await menuCategoryRepository.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Menu category not found.",
      });
    }

    if (hasDirectRestaurantAccess(req, category.restaurantId)) {
      req.tenantContext = { ...req.tenantContext, restaurantId: category.restaurantId };
      return next();
    }

    const restaurant = await restaurantRepository.findById(category.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
      });
    }

    if (hasOrganizationAccess(req, restaurant.organizationId)) {
      req.tenantContext = {
        ...req.tenantContext,
        restaurantId: category.restaurantId,
        organizationId: restaurant.organizationId,
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this menu category.",
    });
  };
}

// Same posture as requireMenuCategoryAccess. MenuItem.restaurantId is
// denormalized onto the row itself (not derived via menuCategoryId), so
// this resolves the same way without an extra join.
export function requireMenuItemAccess(paramName = "itemId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const itemId = getParam(req, paramName);

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: `Missing route parameter "${paramName}".`,
      });
    }

    const item = await menuItemRepository.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    if (hasDirectRestaurantAccess(req, item.restaurantId)) {
      req.tenantContext = { ...req.tenantContext, restaurantId: item.restaurantId };
      return next();
    }

    const restaurant = await restaurantRepository.findById(item.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
      });
    }

    if (hasOrganizationAccess(req, restaurant.organizationId)) {
      req.tenantContext = {
        ...req.tenantContext,
        restaurantId: item.restaurantId,
        organizationId: restaurant.organizationId,
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have access to this menu item.",
    });
  };
}

// Restaurant Product Foundation (Sprint 1.3) — Unit/IngredientCategory/
// Supplier/Ingredient/Recipe/RecipeIngredient are all Restaurant-scoped
// with restaurantId denormalized directly on the row (same posture as
// MenuItem), so their access guards are structurally identical to
// requireMenuCategoryAccess/requireMenuItemAccess above. Factored into one
// helper here (unlike those two, kept separate to avoid touching working
// Sprint 1.1 code) so six near-identical guards don't become six
// copy-pasted implementations, per this sprint's "no duplicated logic"
// requirement.
function createRestaurantScopedAccessGuard(
  resourceLabel: string,
  paramName: string,
  findById: (id: string) => Promise<{ restaurantId: string } | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = getParam(req, paramName);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: `Missing route parameter "${paramName}".`,
      });
    }

    const row = await findById(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: `${resourceLabel} not found.`,
      });
    }

    if (hasDirectRestaurantAccess(req, row.restaurantId)) {
      req.tenantContext = { ...req.tenantContext, restaurantId: row.restaurantId };
      return next();
    }

    const restaurant = await restaurantRepository.findById(row.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found.",
      });
    }

    if (hasOrganizationAccess(req, restaurant.organizationId)) {
      req.tenantContext = {
        ...req.tenantContext,
        restaurantId: row.restaurantId,
        organizationId: restaurant.organizationId,
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `You do not have access to this ${resourceLabel.toLowerCase()}.`,
    });
  };
}

export function requireUnitAccess(paramName = "unitId") {
  return createRestaurantScopedAccessGuard("Unit", paramName, (id) => unitRepository.findById(id));
}

export function requireIngredientCategoryAccess(paramName = "ingredientCategoryId") {
  return createRestaurantScopedAccessGuard("Ingredient category", paramName, (id) =>
    ingredientCategoryRepository.findById(id)
  );
}

export function requireSupplierAccess(paramName = "supplierId") {
  return createRestaurantScopedAccessGuard("Supplier", paramName, (id) =>
    supplierRepository.findById(id)
  );
}

export function requireIngredientAccess(paramName = "ingredientId") {
  return createRestaurantScopedAccessGuard("Ingredient", paramName, (id) =>
    ingredientRepository.findById(id)
  );
}

export function requireRecipeAccess(paramName = "recipeId") {
  return createRestaurantScopedAccessGuard("Recipe", paramName, (id) =>
    recipeRepository.findById(id)
  );
}

// recipeId's own requireRecipeAccess already guards the nested
// /recipes/:recipeId/ingredients list/create routes — this guards the
// top-level /recipe-ingredients/:recipeIngredientId single-line routes,
// resolved via RecipeIngredient.restaurantId (denormalized, not derived via
// recipeId) the same way MenuItem resolves without going through
// menuCategoryId.
export function requireRecipeIngredientAccess(paramName = "recipeIngredientId") {
  return createRestaurantScopedAccessGuard("Recipe ingredient", paramName, (id) =>
    recipeIngredientRepository.findById(id)
  );
}

// Most-specific-wins: a direct BranchMember role is used if present,
// otherwise the RestaurantMember role for the resolved restaurant,
// otherwise the OrganizationMember role for the resolved organization.
// Reads only req.tenantContext (set by whichever of
// requireOrganizationAccess/requireRestaurantAccess/requireBranchAccess/
// requireMenuCategoryAccess/requireMenuItemAccess ran earlier in the same
// chain) and req.user's already-loaded membership arrays — no query.
function resolveEffectiveTenantRole(req: Request): TenantRole | undefined {
  const { branchId, restaurantId, organizationId } = req.tenantContext ?? {};

  if (branchId) {
    const membership = req.user.branchMemberships.find((m) => m.branchId === branchId);
    if (membership) return membership.role;
  }

  if (restaurantId) {
    const membership = req.user.restaurantMemberships.find((m) => m.restaurantId === restaurantId);
    if (membership) return membership.role;
  }

  if (organizationId) {
    const membership = req.user.organizationMemberships.find(
      (m) => m.organizationId === organizationId
    );
    if (membership) return membership.role;
  }

  return undefined;
}

// Sprint 1.2 (ADR-0036) — answers "what can this user do inside the
// Restaurant/Branch/Organization they already have access to," the
// counterpart to requirePermission's "can this user use the module at
// all." Must be composed *after* one of requireOrganizationAccess/
// requireRestaurantAccess/requireBranchAccess/requireMenuCategoryAccess/
// requireMenuItemAccess on the same route — those populate
// req.tenantContext; without it this always denies (fails closed, never
// open). Same "any of these" shape as requirePermission(...permissions).
export function requireTenantRole(...roles: TenantRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const effectiveRole = resolveEffectiveTenantRole(req);

    if (!effectiveRole || !roles.includes(effectiveRole)) {
      return res.status(403).json({
        success: false,
        message: "Your role does not have permission to perform this action.",
      });
    }

    next();
  };
}

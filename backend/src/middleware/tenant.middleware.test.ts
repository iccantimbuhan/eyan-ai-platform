import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";

const findRestaurantByIdMock = vi.fn();
const findBranchByIdMock = vi.fn();
const findOrganizationByIdMock = vi.fn();
const findMenuCategoryByIdMock = vi.fn();
const findMenuItemByIdMock = vi.fn();
const findUnitByIdMock = vi.fn();
const findIngredientCategoryByIdMock = vi.fn();
const findSupplierByIdMock = vi.fn();
const findIngredientByIdMock = vi.fn();
const findRecipeByIdMock = vi.fn();
const findRecipeIngredientByIdMock = vi.fn();

vi.mock("../repositories/restaurant.repository.js", () => ({
  restaurantRepository: { findById: findRestaurantByIdMock },
}));

vi.mock("../repositories/branch.repository.js", () => ({
  branchRepository: { findById: findBranchByIdMock },
}));

vi.mock("../repositories/organization.repository.js", () => ({
  organizationRepository: { findById: findOrganizationByIdMock },
}));

vi.mock("../repositories/menu-category.repository.js", () => ({
  menuCategoryRepository: { findById: findMenuCategoryByIdMock },
}));

vi.mock("../repositories/menu-item.repository.js", () => ({
  menuItemRepository: { findById: findMenuItemByIdMock },
}));

vi.mock("../repositories/unit.repository.js", () => ({
  unitRepository: { findById: findUnitByIdMock },
}));

vi.mock("../repositories/ingredient-category.repository.js", () => ({
  ingredientCategoryRepository: { findById: findIngredientCategoryByIdMock },
}));

vi.mock("../repositories/supplier.repository.js", () => ({
  supplierRepository: { findById: findSupplierByIdMock },
}));

vi.mock("../repositories/ingredient.repository.js", () => ({
  ingredientRepository: { findById: findIngredientByIdMock },
}));

vi.mock("../repositories/recipe.repository.js", () => ({
  recipeRepository: { findById: findRecipeByIdMock },
}));

vi.mock("../repositories/recipe-ingredient.repository.js", () => ({
  recipeIngredientRepository: { findById: findRecipeIngredientByIdMock },
}));

const {
  requireRestaurantAccess,
  requireBranchAccess,
  requireOrganizationAccess,
  requireMenuCategoryAccess,
  requireMenuItemAccess,
  requireUnitAccess,
  requireIngredientCategoryAccess,
  requireSupplierAccess,
  requireIngredientAccess,
  requireRecipeAccess,
  requireRecipeIngredientAccess,
  requireTenantRole,
} = await import("./tenant.middleware.js");

function createRequest(options: {
  params?: Record<string, string>;
  organizationMemberships?: { organizationId: string; role?: string }[];
  restaurantMemberships?: { restaurantId: string; role?: string }[];
  branchMemberships?: { branchId: string; role?: string }[];
  tenantContext?: { organizationId?: string; restaurantId?: string; branchId?: string };
}): Request {
  return {
    params: options.params ?? {},
    user: {
      organizationMemberships: options.organizationMemberships ?? [],
      restaurantMemberships: options.restaurantMemberships ?? [],
      branchMemberships: options.branchMemberships ?? [],
    },
    tenantContext: options.tenantContext,
  } as unknown as Request;
}

function createResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// Cross-tenant isolation coverage for Sprint 0 (ADR-0025) — this is the
// single highest-risk footgun called out in the architecture package:
// Restaurant repositories/middleware must always filter by tenant,
// unlike Finance/CRM's deliberate shared-workspace posture.
describe("requireRestaurantAccess", () => {
  beforeEach(() => {
    findRestaurantByIdMock.mockReset();
  });

  it("calls next() when the user has a direct RestaurantMember row for the restaurant", async () => {
    const req = createRequest({
      params: { restaurantId: "rest-1" },
      restaurantMemberships: [{ restaurantId: "rest-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireRestaurantAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(findRestaurantByIdMock).not.toHaveBeenCalled();
  });

  it("calls next() when the user has OrganizationMember on the restaurant's parent Organization", async () => {
    findRestaurantByIdMock.mockResolvedValue({
      id: "rest-1",
      organizationId: "org-1",
    });
    const req = createRequest({
      params: { restaurantId: "rest-1" },
      organizationMemberships: [{ organizationId: "org-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireRestaurantAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("responds 403 for a restaurant under an Organization the user has no membership on — cross-tenant isolation", async () => {
    findRestaurantByIdMock.mockResolvedValue({
      id: "rest-other-tenant",
      organizationId: "org-other-tenant",
    });
    const req = createRequest({
      params: { restaurantId: "rest-other-tenant" },
      organizationMemberships: [{ organizationId: "org-mine" }],
      restaurantMemberships: [{ restaurantId: "rest-mine" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireRestaurantAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("responds 404 when the restaurant does not exist", async () => {
    findRestaurantByIdMock.mockResolvedValue(null);
    const req = createRequest({ params: { restaurantId: "missing" } });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireRestaurantAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("responds 400 when the route param is missing", async () => {
    const req = createRequest({ params: {} });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireRestaurantAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("respects a custom param name", async () => {
    const req = createRequest({
      params: { id: "rest-1" },
      restaurantMemberships: [{ restaurantId: "rest-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireRestaurantAccess("id")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireBranchAccess", () => {
  beforeEach(() => {
    findBranchByIdMock.mockReset();
    findRestaurantByIdMock.mockReset();
  });

  // Sprint 1.2 (ADR-0036) — BranchMember is the new, most-specific tier;
  // a direct match must short-circuit before any DB lookup, same posture
  // as the existing RestaurantMember/OrganizationMember tiers.
  it("calls next() when the user has a direct BranchMember row for the branch — no DB lookup", async () => {
    const req = createRequest({
      params: { branchId: "branch-1" },
      branchMemberships: [{ branchId: "branch-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireBranchAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(findBranchByIdMock).not.toHaveBeenCalled();
    expect(findRestaurantByIdMock).not.toHaveBeenCalled();
  });

  it("calls next() when the user has a direct RestaurantMember row for the branch's parent restaurant", async () => {
    findBranchByIdMock.mockResolvedValue({
      id: "branch-1",
      restaurantId: "rest-1",
    });
    const req = createRequest({
      params: { branchId: "branch-1" },
      restaurantMemberships: [{ restaurantId: "rest-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireBranchAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(findRestaurantByIdMock).not.toHaveBeenCalled();
  });

  it("calls next() when the user has OrganizationMember on the branch's grandparent Organization", async () => {
    findBranchByIdMock.mockResolvedValue({
      id: "branch-1",
      restaurantId: "rest-1",
    });
    findRestaurantByIdMock.mockResolvedValue({
      id: "rest-1",
      organizationId: "org-1",
    });
    const req = createRequest({
      params: { branchId: "branch-1" },
      organizationMemberships: [{ organizationId: "org-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireBranchAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("responds 403 for a branch under a different tenant entirely — cross-tenant isolation", async () => {
    findBranchByIdMock.mockResolvedValue({
      id: "branch-other-tenant",
      restaurantId: "rest-other-tenant",
    });
    findRestaurantByIdMock.mockResolvedValue({
      id: "rest-other-tenant",
      organizationId: "org-other-tenant",
    });
    const req = createRequest({
      params: { branchId: "branch-other-tenant" },
      organizationMemberships: [{ organizationId: "org-mine" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireBranchAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("responds 404 when the branch does not exist", async () => {
    findBranchByIdMock.mockResolvedValue(null);
    const req = createRequest({ params: { branchId: "missing" } });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireBranchAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// Sprint 1.1 — guards the one Restaurant operation that sits at the
// Organization level (creating/listing Restaurants).
describe("requireOrganizationAccess", () => {
  beforeEach(() => {
    findOrganizationByIdMock.mockReset();
  });

  it("calls next() when the user has an OrganizationMember row for the organization", async () => {
    const req = createRequest({
      params: { organizationId: "org-1" },
      organizationMemberships: [{ organizationId: "org-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireOrganizationAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(findOrganizationByIdMock).not.toHaveBeenCalled();
  });

  it("responds 403 for an organization the user has no membership on — cross-tenant isolation", async () => {
    findOrganizationByIdMock.mockResolvedValue({ id: "org-other-tenant" });
    const req = createRequest({
      params: { organizationId: "org-other-tenant" },
      organizationMemberships: [{ organizationId: "org-mine" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireOrganizationAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("responds 404 when the organization does not exist", async () => {
    findOrganizationByIdMock.mockResolvedValue(null);
    const req = createRequest({ params: { organizationId: "missing" } });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireOrganizationAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("responds 400 when the route param is missing", async () => {
    const req = createRequest({ params: {} });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireOrganizationAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("requireMenuCategoryAccess", () => {
  beforeEach(() => {
    findMenuCategoryByIdMock.mockReset();
    findRestaurantByIdMock.mockReset();
  });

  it("calls next() when the user has a direct RestaurantMember row for the category's restaurant", async () => {
    findMenuCategoryByIdMock.mockResolvedValue({ id: "cat-1", restaurantId: "rest-1" });
    const req = createRequest({
      params: { categoryId: "cat-1" },
      restaurantMemberships: [{ restaurantId: "rest-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuCategoryAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(findRestaurantByIdMock).not.toHaveBeenCalled();
  });

  it("calls next() when the user has OrganizationMember on the category's grandparent Organization", async () => {
    findMenuCategoryByIdMock.mockResolvedValue({ id: "cat-1", restaurantId: "rest-1" });
    findRestaurantByIdMock.mockResolvedValue({ id: "rest-1", organizationId: "org-1" });
    const req = createRequest({
      params: { categoryId: "cat-1" },
      organizationMemberships: [{ organizationId: "org-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuCategoryAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("responds 403 for a category under a different tenant entirely — cross-tenant isolation", async () => {
    findMenuCategoryByIdMock.mockResolvedValue({
      id: "cat-other-tenant",
      restaurantId: "rest-other-tenant",
    });
    findRestaurantByIdMock.mockResolvedValue({
      id: "rest-other-tenant",
      organizationId: "org-other-tenant",
    });
    const req = createRequest({
      params: { categoryId: "cat-other-tenant" },
      organizationMemberships: [{ organizationId: "org-mine" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuCategoryAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("responds 404 when the category does not exist", async () => {
    findMenuCategoryByIdMock.mockResolvedValue(null);
    const req = createRequest({ params: { categoryId: "missing" } });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuCategoryAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("requireMenuItemAccess", () => {
  beforeEach(() => {
    findMenuItemByIdMock.mockReset();
    findRestaurantByIdMock.mockReset();
  });

  it("calls next() when the user has a direct RestaurantMember row for the item's restaurant", async () => {
    findMenuItemByIdMock.mockResolvedValue({ id: "item-1", restaurantId: "rest-1" });
    const req = createRequest({
      params: { itemId: "item-1" },
      restaurantMemberships: [{ restaurantId: "rest-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuItemAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(findRestaurantByIdMock).not.toHaveBeenCalled();
  });

  it("calls next() when the user has OrganizationMember on the item's grandparent Organization", async () => {
    findMenuItemByIdMock.mockResolvedValue({ id: "item-1", restaurantId: "rest-1" });
    findRestaurantByIdMock.mockResolvedValue({ id: "rest-1", organizationId: "org-1" });
    const req = createRequest({
      params: { itemId: "item-1" },
      organizationMemberships: [{ organizationId: "org-1" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuItemAccess()(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("responds 403 for an item under a different tenant entirely — cross-tenant isolation", async () => {
    findMenuItemByIdMock.mockResolvedValue({
      id: "item-other-tenant",
      restaurantId: "rest-other-tenant",
    });
    findRestaurantByIdMock.mockResolvedValue({
      id: "rest-other-tenant",
      organizationId: "org-other-tenant",
    });
    const req = createRequest({
      params: { itemId: "item-other-tenant" },
      organizationMemberships: [{ organizationId: "org-mine" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuItemAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("responds 404 when the item does not exist", async () => {
    findMenuItemByIdMock.mockResolvedValue(null);
    const req = createRequest({ params: { itemId: "missing" } });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    await requireMenuItemAccess()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// Restaurant Product Foundation (Sprint 1.3) — Unit/IngredientCategory/
// Supplier/Ingredient/Recipe/RecipeIngredient all share the same
// createRestaurantScopedAccessGuard implementation, so their cross-tenant
// isolation behavior is identical to requireMenuCategoryAccess/
// requireMenuItemAccess above. One generator covers all six instead of six
// copy-pasted describe blocks.
function describeRestaurantScopedGuard(
  name: string,
  guard: (paramName?: string) => (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  findByIdMock: ReturnType<typeof vi.fn>,
  idParam: string
) {
  describe(name, () => {
    beforeEach(() => {
      findByIdMock.mockReset();
      findRestaurantByIdMock.mockReset();
    });

    it("calls next() when the user has a direct RestaurantMember row for the resource's restaurant", async () => {
      findByIdMock.mockResolvedValue({ id: "row-1", restaurantId: "rest-1" });
      const req = createRequest({
        params: { [idParam]: "row-1" },
        restaurantMemberships: [{ restaurantId: "rest-1" }],
      });
      const res = createResponse();
      const next = vi.fn() as NextFunction;

      await guard()(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(findRestaurantByIdMock).not.toHaveBeenCalled();
    });

    it("calls next() when the user has OrganizationMember on the resource's parent Organization", async () => {
      findByIdMock.mockResolvedValue({ id: "row-1", restaurantId: "rest-1" });
      findRestaurantByIdMock.mockResolvedValue({ id: "rest-1", organizationId: "org-1" });
      const req = createRequest({
        params: { [idParam]: "row-1" },
        organizationMemberships: [{ organizationId: "org-1" }],
      });
      const res = createResponse();
      const next = vi.fn() as NextFunction;

      await guard()(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it("responds 403 for a row under a different tenant entirely — cross-tenant isolation", async () => {
      findByIdMock.mockResolvedValue({ id: "row-other-tenant", restaurantId: "rest-other-tenant" });
      findRestaurantByIdMock.mockResolvedValue({
        id: "rest-other-tenant",
        organizationId: "org-other-tenant",
      });
      const req = createRequest({
        params: { [idParam]: "row-other-tenant" },
        organizationMemberships: [{ organizationId: "org-mine" }],
      });
      const res = createResponse();
      const next = vi.fn() as NextFunction;

      await guard()(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("responds 404 when the resource does not exist", async () => {
      findByIdMock.mockResolvedValue(null);
      const req = createRequest({ params: { [idParam]: "missing" } });
      const res = createResponse();
      const next = vi.fn() as NextFunction;

      await guard()(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
}

describeRestaurantScopedGuard("requireUnitAccess", requireUnitAccess, findUnitByIdMock, "unitId");
describeRestaurantScopedGuard(
  "requireIngredientCategoryAccess",
  requireIngredientCategoryAccess,
  findIngredientCategoryByIdMock,
  "ingredientCategoryId"
);
describeRestaurantScopedGuard(
  "requireSupplierAccess",
  requireSupplierAccess,
  findSupplierByIdMock,
  "supplierId"
);
describeRestaurantScopedGuard(
  "requireIngredientAccess",
  requireIngredientAccess,
  findIngredientByIdMock,
  "ingredientId"
);
describeRestaurantScopedGuard(
  "requireRecipeAccess",
  requireRecipeAccess,
  findRecipeByIdMock,
  "recipeId"
);
describeRestaurantScopedGuard(
  "requireRecipeIngredientAccess",
  requireRecipeIngredientAccess,
  findRecipeIngredientByIdMock,
  "recipeIngredientId"
);

// Sprint 1.2 (ADR-0036) — synchronous, no repository mocks needed: every
// case reads only req.tenantContext (as if a prior guard already set it)
// and req.user's membership arrays.
describe("requireTenantRole", () => {
  it("calls next() when the direct BranchMember role is in the allowed list", () => {
    const req = createRequest({
      branchMemberships: [{ branchId: "branch-1", role: "CASHIER" }],
      tenantContext: { branchId: "branch-1" },
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireTenantRole("OWNER", "CASHIER")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("falls back to the RestaurantMember role when no BranchMember row matches", () => {
    const req = createRequest({
      restaurantMemberships: [{ restaurantId: "rest-1", role: "MANAGER" }],
      tenantContext: { restaurantId: "rest-1" },
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireTenantRole("OWNER", "MANAGER")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("falls back to the OrganizationMember role when neither Branch nor Restaurant membership matches", () => {
    const req = createRequest({
      organizationMemberships: [{ organizationId: "org-1", role: "OWNER" }],
      tenantContext: { organizationId: "org-1" },
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireTenantRole("OWNER", "MANAGER")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  // "RestaurantMember overrides OrganizationMember" (and, by extension,
  // BranchMember overrides both) — the exact precedence requested. A user
  // who is only an ACCOUNTANT at the Restaurant level must not inherit a
  // broader OWNER role they happen to also hold at the Organization level
  // being silently ignored in favor of the more specific, intentionally
  // narrower grant.
  it("prefers the RestaurantMember role over a present OrganizationMember role — most-specific-wins", () => {
    const req = createRequest({
      organizationMemberships: [{ organizationId: "org-1", role: "OWNER" }],
      restaurantMemberships: [{ restaurantId: "rest-1", role: "ACCOUNTANT" }],
      tenantContext: { restaurantId: "rest-1", organizationId: "org-1" },
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    // Only ACCOUNTANT is allowed here — if OWNER (the Organization-level
    // role) were used instead, this would incorrectly pass.
    requireTenantRole("ACCOUNTANT")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("responds 403 when the effective role is not in the allowed list", () => {
    const req = createRequest({
      restaurantMemberships: [{ restaurantId: "rest-1", role: "CASHIER" }],
      tenantContext: { restaurantId: "rest-1" },
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireTenantRole("OWNER", "MANAGER")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // Fails closed: requireTenantRole must always be composed after one of
  // the requireXAccess guards. Without req.tenantContext there is no
  // effective role to resolve, so this must never silently allow.
  it("responds 403 when req.tenantContext was never set (composed without a prior tenant-access guard)", () => {
    const req = createRequest({
      organizationMemberships: [{ organizationId: "org-1", role: "OWNER" }],
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireTenantRole("OWNER")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

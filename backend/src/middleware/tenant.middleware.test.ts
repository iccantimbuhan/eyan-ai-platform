import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";

const findRestaurantByIdMock = vi.fn();
const findBranchByIdMock = vi.fn();

vi.mock("../repositories/restaurant.repository.js", () => ({
  restaurantRepository: { findById: findRestaurantByIdMock },
}));

vi.mock("../repositories/branch.repository.js", () => ({
  branchRepository: { findById: findBranchByIdMock },
}));

const { requireRestaurantAccess, requireBranchAccess } = await import(
  "./tenant.middleware.js"
);

function createRequest(options: {
  params?: Record<string, string>;
  organizationMemberships?: { organizationId: string }[];
  restaurantMemberships?: { restaurantId: string }[];
}): Request {
  return {
    params: options.params ?? {},
    user: {
      organizationMemberships: options.organizationMemberships ?? [],
      restaurantMemberships: options.restaurantMemberships ?? [],
    },
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

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenantRole } from "../../middleware/tenant.middleware.js";

// Confirms Sales' write routes (daily sales records, their four line-entry
// types, and the three master-list create routes) are gated by the exact
// role list confirmed for Sprint 2C (ADR-0039): OWNER/MANAGER/SUPERVISOR/
// ACCOUNTANT can write; CASHIER/KITCHEN/INVENTORY_STAFF/legacy STAFF can
// only read. Mirrors inventory-items.permission.test.ts's reasoning: a typo
// in the role list on a route would otherwise only surface as a runtime 403
// nobody expects.
const SALES_WRITE_ROLES = ["OWNER", "MANAGER", "SUPERVISOR", "ACCOUNTANT"] as const;

function createRequest(effectiveRole: string): Request {
  return {
    tenantContext: { branchId: "branch-1" },
    user: {
      branchMemberships: [{ branchId: "branch-1", role: effectiveRole }],
    },
  } as unknown as Request;
}

function createResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("Sales write routes — requirePermission('restaurant') gate", () => {
  it("allows a user holding the 'restaurant' permission", () => {
    const req = {
      user: { roles: [{ role: { permissions: [{ permission: { name: "restaurant" } }] } }] },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("restaurant")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("denies a user without the 'restaurant' permission", () => {
    const req = {
      user: { roles: [{ role: { permissions: [{ permission: { name: "finance" } }] } }] },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requirePermission("restaurant")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("Sales write routes — requireTenantRole(...) role split", () => {
  it.each(SALES_WRITE_ROLES)("allows a branch member with role %s to write", (role) => {
    const req = createRequest(role);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireTenantRole(...SALES_WRITE_ROLES)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it.each(["CASHIER", "KITCHEN", "INVENTORY_STAFF", "STAFF"])(
    "denies a branch member with role %s from writing — read-only role",
    (role) => {
      const req = createRequest(role);
      const res = createResponse();
      const next = vi.fn() as NextFunction;

      requireTenantRole(...SALES_WRITE_ROLES)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  );
});

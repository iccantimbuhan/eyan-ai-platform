import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenantRole } from "../../middleware/tenant.middleware.js";

// Confirms Inventory's write routes (opening stock, minimum-quantity
// update, adjustments, waste, stock count) are gated by the exact role
// list confirmed for Sprint 2A (ADR-0038): OWNER/MANAGER/SUPERVISOR/
// INVENTORY_STAFF can write; CASHIER/KITCHEN/ACCOUNTANT/legacy STAFF can
// only read. A typo in the role list passed to requireTenantRole on the
// route would otherwise only surface as a runtime 403 nobody expects, the
// same reasoning crm-leads.permission.test.ts uses for the "crm"
// permission string.
const INVENTORY_WRITE_ROLES = ["OWNER", "MANAGER", "SUPERVISOR", "INVENTORY_STAFF"] as const;

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

describe("Inventory write routes — requirePermission('restaurant') gate", () => {
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

describe("Inventory write routes — requireTenantRole(...) role split", () => {
  it.each(INVENTORY_WRITE_ROLES)("allows a branch member with role %s to write", (role) => {
    const req = createRequest(role);
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireTenantRole(...INVENTORY_WRITE_ROLES)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it.each(["CASHIER", "KITCHEN", "ACCOUNTANT", "STAFF"])(
    "denies a branch member with role %s from writing — read-only role",
    (role) => {
      const req = createRequest(role);
      const res = createResponse();
      const next = vi.fn() as NextFunction;

      requireTenantRole(...INVENTORY_WRITE_ROLES)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  );
});

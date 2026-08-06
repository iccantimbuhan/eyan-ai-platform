import { ApiError } from "./api-error.js";

// Mirrors MenuCategoryMismatchError's role for Menu Items — a client-
// supplied restaurantId/branchId is never trusted to belong to the
// already-authorized organizationId/restaurantId without re-verifying it.
export class StaffScopeMismatchError extends ApiError {
  constructor(message = "This restaurant or branch does not belong to the given scope.") {
    super(400, message);
    this.name = "StaffScopeMismatchError";
  }
}

// There is no email/invite-link channel in this codebase yet (see
// ADR-0034 — Email is deferred until a real need arises), so inviting a
// brand-new staff member requires the inviter to set an initial password
// directly, the same way `pnpm db:seed` creates the portfolio demo account.
export class StaffInviteRequiresPasswordError extends ApiError {
  constructor(message = "A name and password are required to invite a new staff member.") {
    super(400, message);
    this.name = "StaffInviteRequiresPasswordError";
  }
}

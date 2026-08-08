import { ApiError } from "./api-error.js";

// Thrown when a client-supplied SalesChannel/SalesPaymentMethod/
// SalesCategory/MenuItem id doesn't belong to the same Restaurant that owns
// the target DailySalesRecord's Branch — mirrors InventoryScopeMismatchError.
export class SalesScopeMismatchError extends ApiError {
  constructor(message = "This resource does not belong to the restaurant that owns the given branch.") {
    super(400, message);
    this.name = "SalesScopeMismatchError";
  }
}

// DailySalesRecord.@@unique([branchId, businessDate]) — one sales record
// per Branch per business day (ADR-0039 Decision 1).
export class DailySalesRecordAlreadyExistsError extends ApiError {
  constructor(message = "A daily sales record already exists for this branch on this date.") {
    super(409, message);
    this.name = "DailySalesRecordAlreadyExistsError";
  }
}

// A channel/payment-method/category line entry already exists for this
// record — the manager should delete-and-re-add or use a different
// reference row, not create a duplicate line for the same day.
export class SalesEntryAlreadyExistsError extends ApiError {
  constructor(message = "An entry for this reference already exists on this sales record.") {
    super(409, message);
    this.name = "SalesEntryAlreadyExistsError";
  }
}

// SalesChannel/SalesPaymentMethod/SalesCategory.@@unique([restaurantId, name])
export class SalesReferenceAlreadyExistsError extends ApiError {
  constructor(message = "An entry with this name already exists for this restaurant.") {
    super(409, message);
    this.name = "SalesReferenceAlreadyExistsError";
  }
}

// DailySalesRecord.cashDiscountTotal (ADR-0043 second amendment) can't
// exceed discountsTotal — it's meant to be that figure's cash-only portion,
// never a larger, unrelated amount.
export class InvalidCashDiscountError extends ApiError {
  constructor(message = "Cash discount cannot be greater than total discounts.") {
    super(400, message);
    this.name = "InvalidCashDiscountError";
  }
}

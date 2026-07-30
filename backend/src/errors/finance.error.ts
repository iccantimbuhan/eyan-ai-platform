import { ApiError } from "./api-error.js";

export class BudgetNotConfiguredError extends ApiError {
  constructor(message = "No monthly budget has been set yet.") {
    super(400, message);
    this.name = "BudgetNotConfiguredError";
  }
}

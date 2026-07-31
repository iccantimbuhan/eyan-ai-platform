import { ApiError } from "./api-error.js";

export class InvalidLeadStatusTransitionError extends ApiError {
  constructor(from: string, to: string) {
    super(400, `Cannot move a lead from ${from} to ${to}.`);
    this.name = "InvalidLeadStatusTransitionError";
  }
}

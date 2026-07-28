import { ApiError } from "./api-error.js";

export class InvalidWorkflowSourceError extends ApiError {
  constructor(
    message = "Workflow plans can only be generated for an uploaded video source."
  ) {
    super(400, message);
    this.name = "InvalidWorkflowSourceError";
  }
}

export class WorkflowPlanningFailedError extends ApiError {
  constructor(
    message = "Could not generate a valid editing plan for that request. Try describing the edit differently — for example, mention specific operations like trim, resize, subtitles, or normalize audio."
  ) {
    super(422, message);
    this.name = "WorkflowPlanningFailedError";
  }
}

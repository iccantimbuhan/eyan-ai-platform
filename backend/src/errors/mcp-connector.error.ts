import { ApiError } from "./api-error.js";

export class UnsupportedMcpConnectorError extends ApiError {
  constructor(providerName: string) {
    super(400, `Unsupported MCP connector: "${providerName}".`);
    this.name = "UnsupportedMcpConnectorError";
  }
}

export class McpConnectorNotConfiguredError extends ApiError {
  constructor() {
    super(400, "No MCP connector provider was specified.");
    this.name = "McpConnectorNotConfiguredError";
  }
}

export class McpConnectionError extends ApiError {
  constructor(message = "MCP connector failed to connect.") {
    super(502, message);
    this.name = "McpConnectionError";
  }
}

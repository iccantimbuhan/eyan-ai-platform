import { ApiError } from "./api-error.js";

export class EncryptionKeyNotConfiguredError extends ApiError {
  constructor() {
    super(
      500,
      "AUTOMATION_ENCRYPTION_KEY is not configured or is not a valid base64-encoded 32-byte key."
    );
    this.name = "EncryptionKeyNotConfiguredError";
  }
}

export class CredentialEncryptionError extends ApiError {
  constructor(message = "Failed to encrypt credentials.") {
    super(500, message);
    this.name = "CredentialEncryptionError";
  }
}

export class CredentialDecryptionError extends ApiError {
  constructor(
    message = "Failed to decrypt credentials. The encryption key may have changed or the stored data is corrupted."
  ) {
    super(500, message);
    this.name = "CredentialDecryptionError";
  }
}

export class InvalidCredentialPayloadError extends ApiError {
  constructor(message = "Credentials payload must be a non-empty object.") {
    super(400, message);
    this.name = "InvalidCredentialPayloadError";
  }
}

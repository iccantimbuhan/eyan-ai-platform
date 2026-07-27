import { decrypt, encrypt, parseEncryptionKey } from "../utils/encryption.js";
import { env } from "../config/env.js";
import {
  CredentialDecryptionError,
  CredentialEncryptionError,
  EncryptionKeyNotConfiguredError,
  InvalidCredentialPayloadError,
} from "../errors/automation-connection.error.js";

export interface EncryptedCredentialPayload {
  encryptedCredentials: string;
  credentialsIv: string;
}

// The only thing in the entire MCP Foundation that touches
// AUTOMATION_ENCRYPTION_KEY or the raw crypto primitives. Deliberately
// provider-agnostic (a Record<string, unknown> in, a Record<string,
// unknown> out) and deliberately has NO repository/audit dependency — it
// knows nothing about AutomationConnection rows or who owns them, only how
// to turn a plaintext credential object into ciphertext and back.
// AutomationConnectionService (ConnectionManager) is the only caller, and
// is where persistence + ownership + audit logging live instead. Connectors
// (McpConnector implementations) never call this service or see
// encryptedCredentials — they only ever receive an already-decrypted
// McpConnectorConfig.credentials object.
export class CredentialManagerService {
  encrypt(credentials: Record<string, unknown>): EncryptedCredentialPayload {
    this.validatePayload(credentials);

    const key = this.resolveKey();
    const plaintext = JSON.stringify(credentials);

    try {
      const payload = encrypt(plaintext, key);
      return {
        encryptedCredentials: payload.ciphertext,
        credentialsIv: payload.iv,
      };
    } catch {
      throw new CredentialEncryptionError();
    }
  }

  decrypt(
    encryptedCredentials: string,
    credentialsIv: string
  ): Record<string, unknown> {
    const key = this.resolveKey();

    try {
      const plaintext = decrypt(encryptedCredentials, credentialsIv, key);
      return JSON.parse(plaintext) as Record<string, unknown>;
    } catch {
      throw new CredentialDecryptionError();
    }
  }

  // Rotation is "encrypt a new payload" — no different from encrypt()
  // itself under the hood. Kept as its own named method only so
  // ConnectionManager's call sites read as intent ("rotate" vs "create"),
  // satisfying "prepare the design so future secret rotation can be
  // supported without changing repository interfaces": rotation reuses the
  // exact same AutomationConnectionRepository.update() call a label/
  // metadata edit already uses, just with different fields populated.
  rotate(credentials: Record<string, unknown>): EncryptedCredentialPayload {
    return this.encrypt(credentials);
  }

  private validatePayload(credentials: Record<string, unknown>): void {
    if (
      !credentials ||
      typeof credentials !== "object" ||
      Array.isArray(credentials) ||
      Object.keys(credentials).length === 0
    ) {
      throw new InvalidCredentialPayloadError();
    }
  }

  private resolveKey(): Buffer {
    if (!env.automationEncryptionKey) {
      throw new EncryptionKeyNotConfiguredError();
    }

    try {
      return parseEncryptionKey(env.automationEncryptionKey);
    } catch {
      throw new EncryptionKeyNotConfiguredError();
    }
  }
}

export const credentialManagerService = new CredentialManagerService();

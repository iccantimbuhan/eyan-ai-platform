import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    automationEncryptionKey: "",
  },
}));

import { env } from "../config/env.js";
import { CredentialManagerService } from "./credential-manager.service.js";
import {
  CredentialDecryptionError,
  EncryptionKeyNotConfiguredError,
  InvalidCredentialPayloadError,
} from "../errors/automation-connection.error.js";

const VALID_KEY = crypto.randomBytes(32).toString("base64");
const OTHER_KEY = crypto.randomBytes(32).toString("base64");

function setKey(key: string) {
  (env as { automationEncryptionKey: string }).automationEncryptionKey = key;
}

describe("CredentialManagerService", () => {
  let service: CredentialManagerService;

  beforeEach(() => {
    service = new CredentialManagerService();
    setKey(VALID_KEY);
  });

  describe("encrypt", () => {
    it("encrypts a credentials payload into ciphertext + iv, both base64", () => {
      const result = service.encrypt({ apiKey: "secret-value" });

      expect(result.encryptedCredentials).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(result.credentialsIv).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(result.encryptedCredentials).not.toContain("secret-value");
    });

    it("produces different ciphertext for the same payload each time (random iv)", () => {
      const a = service.encrypt({ apiKey: "same-value" });
      const b = service.encrypt({ apiKey: "same-value" });

      expect(a.encryptedCredentials).not.toBe(b.encryptedCredentials);
      expect(a.credentialsIv).not.toBe(b.credentialsIv);
    });

    it("throws EncryptionKeyNotConfiguredError when no key is configured", () => {
      setKey("");

      expect(() => service.encrypt({ apiKey: "x" })).toThrow(
        EncryptionKeyNotConfiguredError
      );
    });

    it("throws EncryptionKeyNotConfiguredError when the key is the wrong length", () => {
      setKey(Buffer.from("too-short").toString("base64"));

      expect(() => service.encrypt({ apiKey: "x" })).toThrow(
        EncryptionKeyNotConfiguredError
      );
    });

    it("throws InvalidCredentialPayloadError for an empty object", () => {
      expect(() => service.encrypt({})).toThrow(InvalidCredentialPayloadError);
    });

    it("throws InvalidCredentialPayloadError for null", () => {
      expect(() =>
        service.encrypt(null as unknown as Record<string, unknown>)
      ).toThrow(InvalidCredentialPayloadError);
    });
  });

  describe("decrypt", () => {
    it("round-trips a payload encrypted with the same key", () => {
      const payload = { apiKey: "secret-value", scope: ["read", "write"] };
      const encrypted = service.encrypt(payload);

      const decrypted = service.decrypt(
        encrypted.encryptedCredentials,
        encrypted.credentialsIv
      );

      expect(decrypted).toEqual(payload);
    });

    it("throws CredentialDecryptionError when decrypted with the wrong key", () => {
      const encrypted = service.encrypt({ apiKey: "secret-value" });

      setKey(OTHER_KEY);

      expect(() =>
        service.decrypt(encrypted.encryptedCredentials, encrypted.credentialsIv)
      ).toThrow(CredentialDecryptionError);
    });

    it("throws CredentialDecryptionError for a tampered ciphertext", () => {
      const encrypted = service.encrypt({ apiKey: "secret-value" });
      const tampered = Buffer.from(encrypted.encryptedCredentials, "base64");
      tampered[0] = tampered[0]! ^ 0xff;

      expect(() =>
        service.decrypt(tampered.toString("base64"), encrypted.credentialsIv)
      ).toThrow(CredentialDecryptionError);
    });

    it("throws CredentialDecryptionError for garbage input", () => {
      expect(() => service.decrypt("not-valid-base64-ciphertext", "also-not-iv")).toThrow(
        CredentialDecryptionError
      );
    });

    it("throws EncryptionKeyNotConfiguredError when no key is configured", () => {
      const encrypted = service.encrypt({ apiKey: "secret-value" });
      setKey("");

      expect(() =>
        service.decrypt(encrypted.encryptedCredentials, encrypted.credentialsIv)
      ).toThrow(EncryptionKeyNotConfiguredError);
    });
  });

  describe("rotate", () => {
    it("encrypts a new payload, decryptable back to the new value", () => {
      const rotated = service.rotate({ apiKey: "new-secret" });

      const decrypted = service.decrypt(
        rotated.encryptedCredentials,
        rotated.credentialsIv
      );

      expect(decrypted).toEqual({ apiKey: "new-secret" });
    });
  });
});

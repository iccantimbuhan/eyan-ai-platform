import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const KEY_LENGTH_BYTES = 32;
const AUTH_TAG_LENGTH_BYTES = 16;

export interface EncryptedPayload {
  ciphertext: string; // base64: encrypted bytes with the auth tag appended
  iv: string; // base64
}

// AES-256-GCM, the only algorithm this module supports — authenticated
// encryption is required (not plain CBC) so a tampered/corrupted ciphertext
// fails loudly on decrypt() rather than silently returning garbage.
export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  assertKeyLength(key);

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

// Throws (does not return null/undefined) on a wrong key or a
// tampered/corrupted ciphertext — GCM's auth tag check fails inside
// decipher.final(), which callers must handle explicitly rather than
// risk silently trusting unauthenticated data.
export function decrypt(ciphertext: string, iv: string, key: Buffer): string {
  assertKeyLength(key);

  const combined = Buffer.from(ciphertext, "base64");
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH_BYTES);
  const encrypted = combined.subarray(
    0,
    combined.length - AUTH_TAG_LENGTH_BYTES
  );

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// AUTOMATION_ENCRYPTION_KEY is expected as base64, decoding to exactly 32
// bytes (AES-256's key length) — throws rather than silently truncating or
// padding a misconfigured key, since a wrong-length key would otherwise
// fail confusingly deep inside crypto.createCipheriv() instead of here.
export function parseEncryptionKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");

  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `Encryption key must decode to ${KEY_LENGTH_BYTES} bytes (base64-encoded), got ${key.length}.`
    );
  }

  return key;
}

function assertKeyLength(key: Buffer): void {
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `Encryption key must be ${KEY_LENGTH_BYTES} bytes, got ${key.length}.`
    );
  }
}

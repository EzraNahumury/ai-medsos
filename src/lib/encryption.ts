import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { getEnv } from "./env";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = getEnv().TOKEN_ENCRYPTION_KEY;
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
  } catch {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not valid base64. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes, got ${buf.length}. ` +
        "Generate a valid key with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  cachedKey = buf;
  return buf;
}

export function encryptSecret(plainText: string): string {
  if (typeof plainText !== "string" || plainText.length === 0) {
    throw new Error("encryptSecret: plainText must be a non-empty string");
  }
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(encrypted: string): string {
  if (typeof encrypted !== "string" || !encrypted.includes(":")) {
    throw new Error("decryptSecret: malformed payload");
  }
  const [ivB64, tagB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("decryptSecret: malformed payload (missing parts)");
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export function maskToken(token: string | null | undefined): string {
  if (!token) return "";
  if (token.length <= 8) return "********";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

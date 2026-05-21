import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies the X-Hub-Signature-256 header that Meta sends with every webhook POST.
 * The header value looks like:  sha256=<hexdigest>
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;
  if (!appSecret) return false;

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;

  const provided = signatureHeader.slice(prefix.length).trim();
  if (provided.length === 0) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  if (provided.length !== expected.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { verifyMetaSignature } from "@/lib/meta-signature";
import { createEvent } from "@/server/repo/webhook-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- GET: Meta verification ----------
export async function GET(req: NextRequest) {
  const env = getEnv();
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    env.META_WEBHOOK_VERIFY_TOKEN &&
    token === env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ---------- POST: webhook event ----------
export async function POST(req: NextRequest) {
  const env = getEnv();

  // 1) Read raw body for signature verification
  const rawBody = await req.text();

  // 2) Verify Meta signature
  const sig = req.headers.get("x-hub-signature-256");
  const valid = verifyMetaSignature(rawBody, sig, env.META_APP_SECRET);
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // 3) Parse JSON
  let payload: unknown;
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch {
    await createEvent({
      rawPayload: { _raw: rawBody },
      rawBody,
      processingStatus: "ERROR",
      errorMessage: "Invalid JSON in webhook payload",
      processedAt: new Date(),
    });
    return new NextResponse("OK", { status: 200 });
  }

  // 4) Extract simple metadata (defensive)
  let objectType: string | null = null;
  let fieldName: string | null = null;
  let eventId: string | null = null;
  if (payload && typeof payload === "object") {
    const p = payload as {
      object?: string;
      entry?: Array<{
        id?: string;
        changes?: Array<{ field?: string }>;
      }>;
    };
    if (typeof p.object === "string") objectType = p.object;
    if (Array.isArray(p.entry) && p.entry.length > 0) {
      const first = p.entry[0];
      eventId = first?.id ?? null;
      if (Array.isArray(first?.changes) && first.changes.length > 0) {
        fieldName = first.changes[0]?.field ?? null;
      }
    }
  }

  // 5) Persist as PENDING and return 200 immediately.
  await createEvent({
    eventId,
    objectType,
    fieldName,
    rawPayload: payload,
    rawBody,
    processingStatus: "PENDING",
  });

  return new NextResponse("OK", { status: 200 });
}

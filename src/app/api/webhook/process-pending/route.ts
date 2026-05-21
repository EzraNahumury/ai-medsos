import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-response";
import { processPendingWebhookEvents } from "@/server/instagram/webhook";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 20, 1), 100) : 20;
  const result = await processPendingWebhookEvents(limit);
  return ok(result);
}

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-response";
import { listAllForDashboard } from "@/server/repo/instagram-comment";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }
  const brand = req.nextUrl.searchParams.get("brand") ?? undefined;
  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit") || 100), 1),
    500,
  );
  const rows = await listAllForDashboard(brand || undefined, limit);
  const comments = rows.map((c) => ({
    id: c.id,
    igCommentId: c.igCommentId,
    username: c.username,
    text: c.text,
    timestamp: c.timestamp,
    likeCount: c.likeCount,
    sentiment: c.sentiment,
    intent: c.intent,
    needsHumanReview: c.needsHumanReview,
    instagramMediaId: c.instagramMediaId,
    socialAccount: {
      brandName: c.socialAccountBrandName,
      username: c.socialAccountUsername,
      id: c.socialAccountId,
    },
    instagramMedia: c.instagramMediaId
      ? {
          id: c.instagramMediaId,
          igMediaId: c.mediaIgMediaId,
          permalink: c.mediaPermalink,
          mediaType: c.mediaType,
        }
      : null,
  }));
  return ok({ comments });
}

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-response";
import { listAllForDashboard } from "@/server/repo/instagram-media";

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
  const media = rows.map((m) => ({
    id: m.id,
    igMediaId: m.igMediaId,
    mediaType: m.mediaType,
    mediaProductType: m.mediaProductType,
    caption: m.caption,
    permalink: m.permalink,
    thumbnailUrl: m.thumbnailUrl,
    mediaUrl: m.mediaUrl,
    timestamp: m.timestamp,
    username: m.username,
    likeCount: m.likeCount,
    commentsCount: m.commentsCount,
    socialAccount: {
      brandName: m.socialAccountBrandName,
      username: m.socialAccountUsername,
      id: m.socialAccountId,
    },
  }));
  return ok({ media });
}

import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-response";
import { listRecent as listRecentAudit } from "@/server/repo/audit-log";
import {
  count as commentCount,
  listRecentForDashboard as listRecentComments,
} from "@/server/repo/instagram-comment";
import {
  count as mediaCount,
  listRecentByCreatedAt as listRecentMedia,
} from "@/server/repo/instagram-media";
import { listRecent as listRecentMetrics } from "@/server/repo/media-metric";
import { listForDashboard as listAccounts } from "@/server/repo/social-account";
import { listRecent as listRecentJobs } from "@/server/repo/sync-job";
import {
  countPending,
  listRecent as listRecentEvents,
} from "@/server/repo/webhook-event";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }

  const [
    connectedAccounts,
    latestWebhookEvents,
    latestComments,
    latestMedia,
    latestMetricSnapshots,
    latestSyncJobs,
    latestAuditLogs,
    totalMedia,
    totalComments,
    pendingWebhookCount,
  ] = await Promise.all([
    listAccounts(),
    listRecentEvents(10),
    listRecentComments(15),
    listRecentMedia(12),
    listRecentMetrics(12),
    listRecentJobs(10),
    listRecentAudit(15),
    mediaCount(),
    commentCount(),
    countPending(),
  ]);

  return ok({
    connectedAccounts,
    latestWebhookEvents,
    latestComments: latestComments.map((c) => ({
      id: c.id,
      igCommentId: c.igCommentId,
      username: c.username,
      text: c.text,
      timestamp: c.timestamp,
      likeCount: c.likeCount,
      instagramMediaId: c.instagramMediaId,
      socialAccountId: c.socialAccountId,
      socialAccount: c.socialAccountBrandName
        ? { brandName: c.socialAccountBrandName }
        : null,
    })),
    latestMedia: latestMedia.map((m) => ({
      id: m.id,
      igMediaId: m.igMediaId,
      mediaType: m.mediaType,
      caption: m.caption,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnailUrl,
      timestamp: m.timestamp,
      likeCount: m.likeCount,
      commentsCount: m.commentsCount,
      socialAccountId: m.socialAccountId,
      socialAccount:
        m.socialAccountBrandName || m.socialAccountUsername
          ? {
              brandName: m.socialAccountBrandName,
              username: m.socialAccountUsername,
            }
          : null,
    })),
    latestMetricSnapshots,
    latestSyncJobs,
    latestAuditLogs,
    counts: {
      connectedAccounts: connectedAccounts.length,
      totalMedia,
      totalComments,
      pendingWebhookEvents: pendingWebhookCount,
    },
    serverTime: new Date().toISOString(),
  });
}

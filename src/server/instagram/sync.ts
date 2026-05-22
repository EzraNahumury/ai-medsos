import { decryptSecret } from "@/lib/encryption";
import { createAudit } from "@/server/repo/audit-log";
import * as commentRepo from "@/server/repo/instagram-comment";
import * as mediaRepo from "@/server/repo/instagram-media";
import * as metricRepo from "@/server/repo/media-metric";
import * as accountRepo from "@/server/repo/social-account";
import { createJob, updateJob } from "@/server/repo/sync-job";
import {
  getAllInstagramMedia,
  getAllMediaComments,
  getCommentDetail,
  getInstagramProfile,
  getMediaInsights,
  GraphApiError,
  parseInsightResponse,
} from "./client";
import type { IgComment } from "./types";

// Pagination/page-size for Graph API requests.
const MEDIA_PAGE_SIZE = 100;
// Safety cap for total items synced per run — prevents runaway loops on
// accounts with tens of thousands of items.
const MEDIA_MAX_ITEMS = 5_000;
const INSIGHT_MEDIA_LIMIT = 1_000; // metric snapshots per run
const COMMENT_MEDIA_LIMIT = 1_000; // media to walk for comments per run

type SyncOutcome = {
  ok: boolean;
  itemsProcessed: number;
  message?: string;
  warnings: string[];
};

async function audit(
  action: string,
  status: "OK" | "ERROR" | "WARN",
  socialAccountId: number,
  message?: string,
  meta?: unknown,
) {
  await createAudit({
    actor: "sync",
    action,
    entityType: "SocialAccount",
    entityId: String(socialAccountId),
    status,
    message: message ?? null,
    metadata: meta,
  });
}

async function loadAccountOrThrow(accountId: number) {
  const account = await accountRepo.findById(accountId);
  if (!account) throw new Error(`SocialAccount ${accountId} not found`);
  return account;
}

function safeError(e: unknown): string {
  if (e instanceof GraphApiError) {
    return `${e.message} (status=${e.status}${e.code ? `, code=${e.code}` : ""})`;
  }
  return e instanceof Error ? e.message : String(e);
}

function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ----- syncProfile -----
export async function syncProfile(accountId: number): Promise<SyncOutcome> {
  const account = await loadAccountOrThrow(accountId);
  try {
    const token = decryptSecret(account.encryptedPageAccessToken);
    const profile = await getInstagramProfile(account.igUserId, token);
    await accountRepo.updateProfileSync(account.id, {
      username: profile.username ?? account.username,
      name: profile.name ?? account.name,
      profilePictureUrl:
        profile.profile_picture_url ?? account.profilePictureUrl,
      followersCount: profile.followers_count ?? account.followersCount,
      followsCount: profile.follows_count ?? account.followsCount,
      mediaCount: profile.media_count ?? account.mediaCount,
      accountType: profile.account_type ?? account.accountType,
    });
    await audit("sync.profile", "OK", account.id, "profile updated");
    return { ok: true, itemsProcessed: 1, warnings: [] };
  } catch (err) {
    const msg = safeError(err);
    await audit("sync.profile", "ERROR", account.id, msg);
    return { ok: false, itemsProcessed: 0, message: msg, warnings: [] };
  }
}

// ----- syncMedia -----
export async function syncMedia(accountId: number): Promise<SyncOutcome> {
  const account = await loadAccountOrThrow(accountId);
  const warnings: string[] = [];
  try {
    const token = decryptSecret(account.encryptedPageAccessToken);
    const list = await getAllInstagramMedia(account.igUserId, token, {
      pageSize: MEDIA_PAGE_SIZE,
      maxItems: MEDIA_MAX_ITEMS,
    });
    let processed = 0;
    for (const m of list) {
      try {
        await mediaRepo.upsertByIgMediaId({
          socialAccountId: account.id,
          igMediaId: m.id,
          mediaType: m.media_type ?? null,
          mediaProductType: m.media_product_type ?? null,
          caption: m.caption ?? null,
          permalink: m.permalink ?? null,
          mediaUrl: m.media_url ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          timestamp: toDate(m.timestamp),
          username: m.username ?? null,
          likeCount: m.like_count ?? null,
          commentsCount: m.comments_count ?? null,
          rawJson: m,
        });
        processed++;
      } catch (e) {
        warnings.push(`media ${m.id}: ${safeError(e)}`);
      }
    }
    await accountRepo.touchLastSync(account.id, "lastMediaSyncAt");
    await audit(
      "sync.media",
      warnings.length === 0 ? "OK" : "WARN",
      account.id,
      `synced ${processed}/${list.length} media`,
      { warnings },
    );
    return { ok: true, itemsProcessed: processed, warnings };
  } catch (err) {
    const msg = safeError(err);
    await audit("sync.media", "ERROR", account.id, msg);
    return { ok: false, itemsProcessed: 0, message: msg, warnings };
  }
}

// ----- syncInsights -----
function computeEngagementRate(n: {
  totalInteractions?: number;
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}): number | undefined {
  if (n.totalInteractions !== undefined && n.reach && n.reach > 0) {
    return (n.totalInteractions / n.reach) * 100;
  }
  const sum =
    (n.likes ?? 0) + (n.comments ?? 0) + (n.shares ?? 0) + (n.saves ?? 0);
  if (sum > 0 && n.impressions && n.impressions > 0) {
    return (sum / n.impressions) * 100;
  }
  return undefined;
}

export async function syncInsights(accountId: number): Promise<SyncOutcome> {
  const account = await loadAccountOrThrow(accountId);
  const warnings: string[] = [];
  try {
    const token = decryptSecret(account.encryptedPageAccessToken);
    const recent = await mediaRepo.listBySocialAccount(
      account.id,
      INSIGHT_MEDIA_LIMIT,
    );
    let processed = 0;
    for (const media of recent) {
      try {
        const { data, errors } = await getMediaInsights(media.igMediaId, token);
        if (errors.length > 0) {
          warnings.push(
            `insights ${media.igMediaId}: ${errors
              .map((e) => `${e.metric}=${e.error}`)
              .join("; ")}`,
          );
        }
        const norm = parseInsightResponse(data);
        const engagementRate = computeEngagementRate(norm);
        await metricRepo.createSnapshot({
          instagramMediaId: media.id,
          views: norm.views ?? null,
          plays: norm.plays ?? null,
          reach: norm.reach ?? null,
          impressions: norm.impressions ?? null,
          likes: norm.likes ?? null,
          comments: norm.comments ?? null,
          shares: norm.shares ?? null,
          saves: norm.saves ?? null,
          totalInteractions: norm.totalInteractions ?? null,
          engagementRate: engagementRate ?? null,
          rawJson: { data, errors },
        });
        processed++;
      } catch (e) {
        warnings.push(`insights ${media.igMediaId}: ${safeError(e)}`);
      }
    }
    await accountRepo.touchLastSync(account.id, "lastInsightSyncAt");
    await audit(
      "sync.insights",
      warnings.length === 0 ? "OK" : "WARN",
      account.id,
      `snapshots for ${processed}/${recent.length} media`,
      { warnings },
    );
    return { ok: true, itemsProcessed: processed, warnings };
  } catch (err) {
    const msg = safeError(err);
    await audit("sync.insights", "ERROR", account.id, msg);
    return { ok: false, itemsProcessed: 0, message: msg, warnings };
  }
}

// ----- syncComments -----

async function upsertCommentTree(
  socialAccountId: number,
  mediaDbId: number,
  c: IgComment,
  parentCommentId?: string,
) {
  await commentRepo.upsertByIgCommentId({
    socialAccountId,
    instagramMediaId: mediaDbId,
    igCommentId: c.id,
    parentCommentId: parentCommentId ?? null,
    username: c.username ?? null,
    text: c.text ?? null,
    likeCount: c.like_count ?? null,
    timestamp: toDate(c.timestamp),
    rawJson: c,
  });
  const replies = c.replies?.data ?? [];
  for (const r of replies) {
    await upsertCommentTree(socialAccountId, mediaDbId, r, c.id);
  }
}

export async function syncComments(accountId: number): Promise<SyncOutcome> {
  const account = await loadAccountOrThrow(accountId);
  const warnings: string[] = [];
  try {
    const token = decryptSecret(account.encryptedPageAccessToken);
    const recent = await mediaRepo.listBySocialAccount(
      account.id,
      COMMENT_MEDIA_LIMIT,
    );
    let processed = 0;
    for (const media of recent) {
      try {
        const list = await getAllMediaComments(media.igMediaId, token);
        for (const c of list) {
          await upsertCommentTree(account.id, media.id, c);
          processed++;
        }
      } catch (e) {
        warnings.push(`comments ${media.igMediaId}: ${safeError(e)}`);
      }
    }
    await accountRepo.touchLastSync(account.id, "lastCommentSyncAt");
    await audit(
      "sync.comments",
      warnings.length === 0 ? "OK" : "WARN",
      account.id,
      `processed ${processed} comments across ${recent.length} media`,
      { warnings },
    );
    return { ok: true, itemsProcessed: processed, warnings };
  } catch (err) {
    const msg = safeError(err);
    await audit("sync.comments", "ERROR", account.id, msg);
    return { ok: false, itemsProcessed: 0, message: msg, warnings };
  }
}

// ----- syncAll -----
export async function syncAll(accountId: number): Promise<{
  ok: boolean;
  steps: Record<string, SyncOutcome>;
}> {
  const jobId = await createJob({
    jobType: "sync.all",
    socialAccountId: accountId,
    status: "RUNNING",
    startedAt: new Date(),
  });
  const steps: Record<string, SyncOutcome> = {};
  let ok = true;
  try {
    steps.profile = await syncProfile(accountId);
    if (!steps.profile.ok) ok = false;
    steps.media = await syncMedia(accountId);
    if (!steps.media.ok) ok = false;
    steps.insights = await syncInsights(accountId);
    if (!steps.insights.ok) ok = false;
    steps.comments = await syncComments(accountId);
    if (!steps.comments.ok) ok = false;
  } catch (err) {
    await updateJob(jobId, {
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : String(err),
      finishedAt: new Date(),
    });
    return { ok: false, steps };
  }
  await updateJob(jobId, {
    status: ok ? "DONE" : "ERROR",
    finishedAt: new Date(),
    payload: steps,
  });
  return { ok, steps };
}

// Used by /dev/import-token and /dev/test-token for quick token validation.
// Does not persist anything; returns the profile or throws.
export async function probeProfile(
  igUserId: string,
  accessToken: string,
) {
  return getInstagramProfile(igUserId, accessToken);
}

// Suppress unused vars for clarity (kept to preserve API).
void getCommentDetail;

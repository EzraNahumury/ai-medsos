import { decryptSecret } from "@/lib/encryption";
import { createAudit } from "@/server/repo/audit-log";
import * as commentRepo from "@/server/repo/instagram-comment";
import * as mediaRepo from "@/server/repo/instagram-media";
import * as accountRepo from "@/server/repo/social-account";
import { findById, listPending, updateStatus } from "@/server/repo/webhook-event";
import {
  getCommentDetail,
  getInstagramMediaDetail,
} from "./client";

type AnyPayload = Record<string, unknown> | null | undefined;

type ExtractedIds = {
  commentIds: string[];
  mediaIds: string[];
  igUserIds: string[];
  parentIds: string[];
  fieldNames: string[];
};

export function extractPossibleIdsFromWebhook(payload: unknown): ExtractedIds {
  const out: ExtractedIds = {
    commentIds: [],
    mediaIds: [],
    igUserIds: [],
    parentIds: [],
    fieldNames: [],
  };
  if (!payload || typeof payload !== "object") return out;

  const root = payload as { entry?: unknown };
  const entries = Array.isArray(root.entry) ? root.entry : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as {
      id?: string;
      changes?: unknown;
      messaging?: unknown;
    };
    if (typeof e.id === "string") out.igUserIds.push(e.id);
    const changes = Array.isArray(e.changes) ? e.changes : [];
    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const c = change as { field?: string; value?: AnyPayload };
      if (typeof c.field === "string") out.fieldNames.push(c.field);
      const v = c.value;
      if (v && typeof v === "object") {
        const val = v as Record<string, unknown>;
        if (typeof val.id === "string") {
          if (c.field === "comments" || c.field === "live_comments") {
            out.commentIds.push(val.id);
          } else if (c.field === "media") {
            out.mediaIds.push(val.id);
          }
        }
        if (typeof val.comment_id === "string") out.commentIds.push(val.comment_id);
        if (typeof val.media_id === "string") out.mediaIds.push(val.media_id);
        if (typeof val.parent_id === "string") out.parentIds.push(val.parent_id);
        const media = val.media;
        if (media && typeof media === "object") {
          const mid = (media as Record<string, unknown>).id;
          if (typeof mid === "string") out.mediaIds.push(mid);
        }
      }
    }
  }

  return out;
}

async function findSocialAccountForEvent(ids: ExtractedIds) {
  if (ids.igUserIds.length === 0) {
    return accountRepo.findFirstActive();
  }
  for (const igId of ids.igUserIds) {
    const a = await accountRepo.findByIgUserId(igId);
    if (a) return a;
  }
  return null;
}

async function fetchAndUpsertMedia(
  account: { id: number; encryptedPageAccessToken: string },
  mediaId: string,
) {
  try {
    const token = decryptSecret(account.encryptedPageAccessToken);
    const m = await getInstagramMediaDetail(mediaId, token);
    const { id } = await mediaRepo.upsertByIgMediaId({
      socialAccountId: account.id,
      igMediaId: m.id,
      mediaType: m.media_type ?? null,
      mediaProductType: m.media_product_type ?? null,
      caption: m.caption ?? null,
      permalink: m.permalink ?? null,
      mediaUrl: m.media_url ?? null,
      thumbnailUrl: m.thumbnail_url ?? null,
      timestamp: m.timestamp ? new Date(m.timestamp) : null,
      username: m.username ?? null,
      likeCount: m.like_count ?? null,
      commentsCount: m.comments_count ?? null,
      rawJson: m,
    });
    return { id, igMediaId: m.id };
  } catch {
    return null;
  }
}

async function fetchAndUpsertComment(
  account: { id: number; encryptedPageAccessToken: string },
  commentId: string,
  parentCommentId?: string,
  mediaDbId?: number,
) {
  try {
    const token = decryptSecret(account.encryptedPageAccessToken);
    const c = await getCommentDetail(commentId, token);
    await commentRepo.upsertByIgCommentId({
      socialAccountId: account.id,
      instagramMediaId: mediaDbId ?? null,
      igCommentId: c.id,
      parentCommentId: parentCommentId ?? null,
      username: c.username ?? null,
      text: c.text ?? null,
      likeCount: c.like_count ?? null,
      timestamp: c.timestamp ? new Date(c.timestamp) : null,
      rawJson: c,
    });
    return true;
  } catch {
    return false;
  }
}

export async function processWebhookPayload(eventId: number): Promise<{
  ok: boolean;
  message: string;
}> {
  const event = await findById(eventId);
  if (!event) return { ok: false, message: "event not found" };

  const ids = extractPossibleIdsFromWebhook(event.rawPayload);
  const fieldName = ids.fieldNames[0] ?? event.fieldName ?? null;
  const objectType =
    (event.rawPayload as { object?: string } | null)?.object ?? null;

  const account = await findSocialAccountForEvent(ids);
  if (!account) {
    return { ok: false, message: "no matching SocialAccount" };
  }

  const mediaDbIdByIgId = new Map<string, number>();
  for (const mid of Array.from(new Set(ids.mediaIds))) {
    const m = await fetchAndUpsertMedia(account, mid);
    if (m) mediaDbIdByIgId.set(m.igMediaId, m.id);
  }

  for (const cid of Array.from(new Set(ids.commentIds))) {
    let mediaDbId: number | undefined = undefined;
    if (ids.mediaIds[0] && mediaDbIdByIgId.has(ids.mediaIds[0])) {
      mediaDbId = mediaDbIdByIgId.get(ids.mediaIds[0]);
    }
    await fetchAndUpsertComment(account, cid, ids.parentIds[0], mediaDbId);
  }

  await createAudit({
    actor: "webhook",
    action: "webhook.processed",
    entityType: "IgWebhookEvent",
    entityId: String(event.id),
    status: "OK",
    message: `field=${fieldName ?? "?"} mediaIds=${ids.mediaIds.length} commentIds=${ids.commentIds.length}`,
    metadata: { ids, objectType, fieldName },
  });

  // Persist back fieldName / objectType we discovered
  await updateStatus(event.id, {
    processingStatus: "DONE",
    processedAt: new Date(),
    errorMessage: null,
    objectType,
    fieldName,
  });

  return {
    ok: true,
    message: `processed (field=${fieldName ?? "?"}, mediaIds=${ids.mediaIds.length}, commentIds=${ids.commentIds.length})`,
  };
}

export async function processPendingWebhookEvents(
  limit = 20,
): Promise<{
  scanned: number;
  done: number;
  errored: number;
  details: Array<{ id: number; status: string; message: string }>;
}> {
  const pending = await listPending(limit);
  const details: Array<{ id: number; status: string; message: string }> = [];
  let done = 0;
  let errored = 0;

  for (const ev of pending) {
    await updateStatus(ev.id, { processingStatus: "PROCESSING" });
    try {
      const r = await processWebhookPayload(ev.id);
      if (r.ok) {
        done++;
        details.push({ id: ev.id, status: "DONE", message: r.message });
      } else {
        await updateStatus(ev.id, {
          processingStatus: "ERROR",
          processedAt: new Date(),
          errorMessage: r.message,
        });
        errored++;
        details.push({ id: ev.id, status: "ERROR", message: r.message });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateStatus(ev.id, {
        processingStatus: "ERROR",
        processedAt: new Date(),
        errorMessage: msg,
      });
      errored++;
      details.push({ id: ev.id, status: "ERROR", message: msg });
    }
  }

  return { scanned: pending.length, done, errored, details };
}

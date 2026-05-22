import { getGraphBaseUrl } from "@/lib/env";
import type {
  IgComment,
  IgInsightDatum,
  IgInsightResponse,
  IgMedia,
  IgProfile,
  NormalizedInsight,
  PagedResponse,
} from "./types";

export class GraphApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly subcode?: number;
  readonly type?: string;
  readonly fbtraceId?: string;
  readonly raw?: unknown;

  constructor(
    message: string,
    status: number,
    raw?: unknown,
    extra?: {
      code?: number;
      subcode?: number;
      type?: string;
      fbtraceId?: string;
    },
  ) {
    super(message);
    this.name = "GraphApiError";
    this.status = status;
    this.raw = raw;
    this.code = extra?.code;
    this.subcode = extra?.subcode;
    this.type = extra?.type;
    this.fbtraceId = extra?.fbtraceId;
  }
}

function buildUrl(
  path: string,
  params: Record<string, string | undefined>,
): string {
  const base = getGraphBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${cleanPath}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  if (!res.ok) {
    const err =
      (json as { error?: { message?: string; code?: number; error_subcode?: number; type?: string; fbtrace_id?: string } } | null)
        ?.error;
    throw new GraphApiError(
      err?.message ?? `Graph API ${res.status}`,
      res.status,
      json,
      {
        code: err?.code,
        subcode: err?.error_subcode,
        type: err?.type,
        fbtraceId: err?.fbtrace_id,
      },
    );
  }
  return json as T;
}

export async function graphGet<T = unknown>(
  path: string,
  accessToken: string,
  params: Record<string, string | undefined> = {},
): Promise<T> {
  const url = buildUrl(path, { ...params, access_token: accessToken });
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parseResponse<T>(res);
}

/**
 * Follow a fully-qualified Graph API URL. Used for paging.next links.
 * The URL already carries `access_token`, so no need to attach it again.
 */
export async function graphGetUrl<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parseResponse<T>(res);
}

export async function graphPost<T = unknown>(
  path: string,
  accessToken: string,
  body: Record<string, string> = {},
): Promise<T> {
  const url = buildUrl(path, {});
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.set(k, v);
  form.set("access_token", accessToken);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
    cache: "no-store",
  });
  return parseResponse<T>(res);
}

// ============================================================
// Instagram-direct API (graph.instagram.com) endpoints
// ============================================================
// In this flow the access token is an Instagram user token. The
// `me` endpoint already refers to the connected IG business account,
// so we can call /me/* directly. We still accept an igUserId for
// callers that want to address a specific account explicitly.

// ----- Profile -----
// Note: account_type from IG-direct returns: "BUSINESS" | "MEDIA_CREATOR".
const PROFILE_FIELDS =
  "id,username,name,profile_picture_url,followers_count,follows_count,media_count,account_type";

export async function getInstagramProfile(
  igUserId: string,
  accessToken: string,
): Promise<IgProfile> {
  // `me` works regardless of igUserId; we prefer explicit id when given.
  const path = igUserId ? `/${igUserId}` : `/me`;
  return graphGet<IgProfile>(path, accessToken, { fields: PROFILE_FIELDS });
}

// ----- Media -----
const MEDIA_FIELDS =
  "id,caption,media_type,media_product_type,permalink,media_url,thumbnail_url,timestamp,username,like_count,comments_count";

export async function getInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit = 50,
): Promise<IgMedia[]> {
  const path = igUserId ? `/${igUserId}/media` : `/me/media`;
  const res = await graphGet<PagedResponse<IgMedia>>(path, accessToken, {
    fields: MEDIA_FIELDS,
    limit: String(limit),
  });
  return res.data ?? [];
}

/**
 * Fetch ALL media for an IG account by following `paging.next` links.
 * Safety cap is high (10k items) to avoid runaway loops.
 *
 * `onPage` lets callers stream progress and abort early by returning false.
 */
export async function getAllInstagramMedia(
  igUserId: string,
  accessToken: string,
  opts?: {
    pageSize?: number;
    maxItems?: number;
    onPage?: (batch: IgMedia[], totalSoFar: number) => boolean | void;
  },
): Promise<IgMedia[]> {
  const pageSize = opts?.pageSize ?? 100;
  const maxItems = opts?.maxItems ?? 10_000;
  const path = igUserId ? `/${igUserId}/media` : `/me/media`;
  const collected: IgMedia[] = [];

  let res = await graphGet<PagedResponse<IgMedia>>(path, accessToken, {
    fields: MEDIA_FIELDS,
    limit: String(pageSize),
  });

  while (true) {
    const batch = res.data ?? [];
    collected.push(...batch);
    const cont = opts?.onPage?.(batch, collected.length);
    if (cont === false) break;
    if (collected.length >= maxItems) break;
    const next = res.paging?.next;
    if (!next) break;
    res = await graphGetUrl<PagedResponse<IgMedia>>(next);
  }

  return collected;
}

export async function getInstagramMediaDetail(
  mediaId: string,
  accessToken: string,
): Promise<IgMedia> {
  return graphGet<IgMedia>(`/${mediaId}`, accessToken, {
    fields: MEDIA_FIELDS,
  });
}

// ----- Comments -----
const COMMENT_FIELDS =
  "id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}";

export async function getMediaComments(
  mediaId: string,
  accessToken: string,
): Promise<IgComment[]> {
  const res = await graphGet<PagedResponse<IgComment>>(
    `/${mediaId}/comments`,
    accessToken,
    { fields: COMMENT_FIELDS, limit: "50" },
  );
  return res.data ?? [];
}

/**
 * Fetch ALL comments on a media by following pagination.
 * Note: replies are still bounded by the inline `replies{...}` expansion;
 * comments with deep reply trees may not be fully captured.
 */
export async function getAllMediaComments(
  mediaId: string,
  accessToken: string,
  opts?: { pageSize?: number; maxItems?: number },
): Promise<IgComment[]> {
  const pageSize = opts?.pageSize ?? 50;
  const maxItems = opts?.maxItems ?? 5_000;
  const collected: IgComment[] = [];

  let res = await graphGet<PagedResponse<IgComment>>(
    `/${mediaId}/comments`,
    accessToken,
    { fields: COMMENT_FIELDS, limit: String(pageSize) },
  );

  while (true) {
    const batch = res.data ?? [];
    collected.push(...batch);
    if (collected.length >= maxItems) break;
    const next = res.paging?.next;
    if (!next) break;
    res = await graphGetUrl<PagedResponse<IgComment>>(next);
  }

  return collected;
}

export async function getCommentDetail(
  commentId: string,
  accessToken: string,
): Promise<IgComment> {
  return graphGet<IgComment>(`/${commentId}`, accessToken, {
    fields: COMMENT_FIELDS,
  });
}

// ----- Insights -----
// IG-direct insights metric names per media type can vary. We attempt a
// defensive list and gracefully skip unsupported ones.
const INSIGHT_METRICS_TO_TRY = [
  "reach",
  "impressions",
  "saved",
  "comments",
  "likes",
  "shares",
  "total_interactions",
  "plays",
  "views",
];

export async function getMediaInsights(
  mediaId: string,
  accessToken: string,
): Promise<{
  data: IgInsightDatum[];
  errors: Array<{ metric: string; error: string }>;
}> {
  try {
    const bulk = await graphGet<IgInsightResponse>(
      `/${mediaId}/insights`,
      accessToken,
      { metric: INSIGHT_METRICS_TO_TRY.join(",") },
    );
    return { data: bulk.data ?? [], errors: [] };
  } catch (bulkErr) {
    const collected: IgInsightDatum[] = [];
    const errors: Array<{ metric: string; error: string }> = [];
    for (const metric of INSIGHT_METRICS_TO_TRY) {
      try {
        const r = await graphGet<IgInsightResponse>(
          `/${mediaId}/insights`,
          accessToken,
          { metric },
        );
        if (r.data) collected.push(...r.data);
      } catch (err) {
        errors.push({
          metric,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (collected.length === 0) {
      errors.push({
        metric: "(bulk)",
        error: bulkErr instanceof Error ? bulkErr.message : String(bulkErr),
      });
    }
    return { data: collected, errors };
  }
}

function readInsightValue(d: IgInsightDatum): number | undefined {
  if (typeof d.total_value?.value === "number") return d.total_value.value;
  const v = d.values?.[d.values.length - 1]?.value;
  if (typeof v === "number") return v;
  return undefined;
}

export function parseInsightResponse(
  data: IgInsightDatum[],
): NormalizedInsight {
  const result: NormalizedInsight = {};
  for (const d of data) {
    const val = readInsightValue(d);
    if (val === undefined) continue;
    switch (d.name) {
      case "reach":
        result.reach = val;
        break;
      case "impressions":
        result.impressions = val;
        break;
      case "saved":
      case "saves":
        result.saves = val;
        break;
      case "comments":
        result.comments = val;
        break;
      case "likes":
        result.likes = val;
        break;
      case "shares":
        result.shares = val;
        break;
      case "total_interactions":
        result.totalInteractions = val;
        break;
      case "plays":
        result.plays = val;
        break;
      case "views":
        result.views = val;
        break;
    }
  }
  return result;
}

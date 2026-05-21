import { randomBytes } from "node:crypto";
import { encryptSecret } from "@/lib/encryption";
import {
  getEnv,
  getInstagramLongLivedTokenUrl,
  getInstagramOAuthDialogUrl,
  getInstagramTokenExchangeUrl,
} from "@/lib/env";
import {
  createState,
  findByState,
  markStateUsed,
} from "@/server/repo/oauth-state";
import {
  findByIgUserId,
  upsertByIgUserId,
} from "@/server/repo/social-account";
import { getInstagramProfile, GraphApiError } from "./client";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function createOAuthState(brandName: string): Promise<string> {
  const state = randomBytes(24).toString("hex");
  await createState({
    state,
    brandName,
    expiresAt: new Date(Date.now() + STATE_TTL_MS),
  });
  return state;
}

export function buildAuthorizeUrl(state: string): string {
  const env = getEnv();
  const url = new URL(getInstagramOAuthDialogUrl());
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
  // IG-direct uses space-separated scopes (per Instagram docs).
  // Comma works too in practice, but spaces are safer.
  url.searchParams.set(
    "scope",
    env.META_OAUTH_SCOPES.split(",").map((s) => s.trim()).join(" "),
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function consumeOAuthState(state: string): Promise<{
  brandName: string;
} | null> {
  const record = await findByState(state);
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  await markStateUsed(state);
  return { brandName: record.brandName };
}

type ShortLivedIgTokenResponse = {
  access_token: string;
  user_id?: number | string;
  permissions?: string[];
};

type LongLivedIgTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

async function fetchOrThrow<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err =
      (json as {
        error?: { message?: string; code?: number };
        error_message?: string;
      } | null) ?? null;
    const message =
      err?.error?.message ??
      err?.error_message ??
      `Instagram OAuth request failed: ${res.status}`;
    throw new GraphApiError(message, res.status, json, {
      code: err?.error?.code,
    });
  }
  return json as T;
}

/**
 * Step 1: exchange the `code` returned by IG OAuth dialog for a short-lived
 * Instagram user token (~1 hour validity).
 * IG-direct requires this as a POST with form-encoded body.
 */
export async function exchangeCodeForShortLivedToken(
  code: string,
): Promise<ShortLivedIgTokenResponse> {
  const env = getEnv();
  const form = new URLSearchParams();
  form.set("client_id", env.META_APP_ID);
  form.set("client_secret", env.META_APP_SECRET);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", env.META_REDIRECT_URI);
  form.set("code", code);
  return fetchOrThrow<ShortLivedIgTokenResponse>(getInstagramTokenExchangeUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

/**
 * Step 2: trade a short-lived IG user token for a long-lived one (60 days).
 */
export async function exchangeShortLivedForLongLivedToken(
  shortToken: string,
): Promise<LongLivedIgTokenResponse> {
  const env = getEnv();
  const url = new URL(getInstagramLongLivedTokenUrl());
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", env.META_APP_SECRET);
  url.searchParams.set("access_token", shortToken);
  return fetchOrThrow<LongLivedIgTokenResponse>(url.toString());
}

export type OAuthCompletionResult = {
  accountsCreated: Array<{
    id: number;
    brandName: string;
    igUserId: string;
    username?: string;
  }>;
  warnings: string[];
};

/**
 * After we have a long-lived IG user token, hit /me on graph.instagram.com
 * to discover the connected IG business account and upsert it as a
 * SocialAccount under the given brand.
 *
 * Unlike the old FB-based flow, there is no "Page" concept here — the IG
 * user token *is* the credential for the IG account.
 */
export async function completeOAuthAndStoreAccounts(opts: {
  brandName: string;
  longLivedUserToken: string;
  tokenExpiresAt: Date | null;
}): Promise<OAuthCompletionResult> {
  const { brandName, longLivedUserToken, tokenExpiresAt } = opts;
  const env = getEnv();
  const scopes = env.META_OAUTH_SCOPES.split(",").map((s) => s.trim()).filter(Boolean);

  const created: OAuthCompletionResult["accountsCreated"] = [];
  const warnings: string[] = [];

  let profile;
  try {
    profile = await getInstagramProfile("", longLivedUserToken); // uses /me
  } catch (err) {
    warnings.push(
      `Failed to fetch IG profile after OAuth: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return { accountsCreated: created, warnings };
  }

  if (!profile?.id) {
    warnings.push("Instagram profile response had no id");
    return { accountsCreated: created, warnings };
  }

  const encryptedPageAccessToken = encryptSecret(longLivedUserToken);
  // We don't have a separate User token in this flow — the IG token *is* it.
  const encryptedUserAccessToken = encryptSecret(longLivedUserToken);

  const id = await upsertByIgUserId({
    brandName,
    platform: "INSTAGRAM",
    igUserId: profile.id,
    pageId: null,
    pageName: null,
    username: profile.username ?? null,
    name: profile.name ?? null,
    profilePictureUrl: profile.profile_picture_url ?? null,
    encryptedPageAccessToken,
    encryptedUserAccessToken,
    tokenExpiresAt,
    tokenStatus: "ACTIVE",
    scopes,
  });

  const stored = await findByIgUserId(profile.id);
  created.push({
    id,
    brandName,
    igUserId: profile.id,
    username: stored?.username ?? profile.username,
  });

  return { accountsCreated: created, warnings };
}

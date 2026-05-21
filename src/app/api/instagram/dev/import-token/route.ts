import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { encryptSecret } from "@/lib/encryption";
import { isDevTokenImportEnabled } from "@/lib/env";
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { isValidBrand } from "@/lib/utils";
import { createAudit } from "@/server/repo/audit-log";
import {
  findByIgUserId,
  updateTokenStatus,
  upsertByIgUserId,
} from "@/server/repo/social-account";
import { probeProfile } from "@/server/instagram/sync";

const Body = z.object({
  brandName: z.string(),
  igUserId: z.string().min(1),
  igUsername: z.string().optional(),
  // Accept both legacy `pageAccessToken`/`userAccessToken` and the new
  // `igAccessToken` so existing curl scripts keep working.
  igAccessToken: z.string().optional(),
  pageAccessToken: z.string().optional(),
  userAccessToken: z.string().optional(),
  pageId: z.string().optional(),
  pageName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }

  if (!isDevTokenImportEnabled()) {
    return forbidden(
      "DEV_ALLOW_MANUAL_TOKEN_IMPORT is disabled. Set it to true in .env (development only).",
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.issues);
  }
  const body = parsed.data;
  if (!isValidBrand(body.brandName)) {
    return badRequest("Invalid brand. Allowed: Ayres, Ava, Saifenu");
  }
  const accessToken =
    body.igAccessToken || body.pageAccessToken || body.userAccessToken;
  if (!accessToken) {
    return badRequest(
      "An Instagram access token is required (field: igAccessToken).",
    );
  }

  let profileOk = false;
  let profileSummary: Record<string, unknown> | null = null;
  try {
    const profile = await probeProfile(body.igUserId, accessToken);
    profileOk = true;
    profileSummary = {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      followers_count: profile.followers_count,
      media_count: profile.media_count,
    };
  } catch (err) {
    profileSummary = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const encryptedPageAccessToken = encryptSecret(accessToken);
    // IG-direct flow has no separate user token. We mirror the IG token
    // into encryptedUserAccessToken so any downstream code expecting one works.
    const encryptedUserAccessToken = encryptSecret(accessToken);

    const id = await upsertByIgUserId({
      brandName: body.brandName,
      platform: "INSTAGRAM",
      igUserId: body.igUserId,
      pageId: body.pageId ?? null,
      pageName: body.pageName ?? null,
      username: body.igUsername ?? null,
      encryptedPageAccessToken,
      encryptedUserAccessToken,
      tokenStatus: profileOk ? "ACTIVE" : "UNVERIFIED",
    });

    await updateTokenStatus(id, profileOk ? "ACTIVE" : "UNVERIFIED");

    const account = await findByIgUserId(body.igUserId);

    await createAudit({
      actor: "dev.import-token",
      action: "account.upsert",
      entityType: "SocialAccount",
      entityId: String(id),
      status: profileOk ? "OK" : "WARN",
      message: profileOk
        ? "manual token import; profile probe succeeded"
        : "manual token import; profile probe failed (token still stored)",
      metadata: { profileSummary },
    });

    return ok({
      account: {
        id,
        brandName: account?.brandName ?? body.brandName,
        igUserId: account?.igUserId ?? body.igUserId,
        username: account?.username ?? body.igUsername ?? null,
        tokenStatus: account?.tokenStatus ?? (profileOk ? "ACTIVE" : "UNVERIFIED"),
      },
      profileProbe: profileSummary,
    });
  } catch (err) {
    return serverError(
      "Failed to store token",
      err instanceof Error ? err.message : String(err),
    );
  }
}

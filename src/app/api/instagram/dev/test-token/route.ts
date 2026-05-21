import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { isDevTokenImportEnabled } from "@/lib/env";
import {
  badRequest,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { probeProfile } from "@/server/instagram/sync";

const Body = z.object({
  accessToken: z.string().min(1),
  igUserId: z.string().min(1),
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

  try {
    const profile = await probeProfile(parsed.data.igUserId, parsed.data.accessToken);
    return ok({
      id: profile.id,
      username: profile.username,
      name: profile.name,
      followers_count: profile.followers_count,
      follows_count: profile.follows_count,
      media_count: profile.media_count,
      account_type: profile.account_type,
    });
  } catch (err) {
    return serverError(
      "Profile probe failed",
      err instanceof Error ? err.message : String(err),
    );
  }
}

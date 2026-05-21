import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { isValidBrand } from "@/lib/utils";
import { buildAuthorizeUrl, createOAuthState } from "@/server/instagram/oauth";

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get("brand");
  if (!brand || !isValidBrand(brand)) {
    return badRequest("Invalid brand. Allowed: Ayres, Ava, Saifenu");
  }
  const env = getEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    return serverError(
      "META_APP_ID/META_APP_SECRET are not configured. Please set them in .env.",
    );
  }
  const state = await createOAuthState(brand);
  const url = buildAuthorizeUrl(state);
  return NextResponse.redirect(url);
}

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { createAudit } from "@/server/repo/audit-log";
import {
  completeOAuthAndStoreAccounts,
  consumeOAuthState,
  exchangeCodeForShortLivedToken,
  exchangeShortLivedForLongLivedToken,
} from "@/server/instagram/oauth";

function appUrl(path: string): string {
  const env = getEnv();
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path}`;
}

async function logAudit(
  status: "OK" | "ERROR" | "WARN",
  message: string,
  meta?: unknown,
) {
  await createAudit({
    actor: "oauth",
    action: "oauth.callback",
    entityType: "OAuthState",
    status,
    message,
    metadata: meta,
  });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  if (error) {
    await logAudit("ERROR", `provider error: ${error} - ${errorDescription}`);
    return NextResponse.redirect(
      appUrl(`/dashboard/accounts?connected=error&reason=${encodeURIComponent(error)}`),
    );
  }
  if (!code) {
    await logAudit("ERROR", "missing code");
    return NextResponse.redirect(
      appUrl(`/dashboard/accounts?connected=error&reason=missing_code`),
    );
  }
  if (!state) {
    await logAudit("ERROR", "missing state");
    return NextResponse.redirect(
      appUrl(`/dashboard/accounts?connected=error&reason=missing_state`),
    );
  }

  const consumed = await consumeOAuthState(state);
  if (!consumed) {
    await logAudit("ERROR", "invalid or expired state");
    return NextResponse.redirect(
      appUrl(`/dashboard/accounts?connected=error&reason=invalid_state`),
    );
  }

  let longToken: { access_token: string; expires_in?: number };
  try {
    const shortToken = await exchangeCodeForShortLivedToken(code);
    longToken = await exchangeShortLivedForLongLivedToken(shortToken.access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logAudit("ERROR", `token exchange failed: ${msg}`);
    return NextResponse.redirect(
      appUrl(`/dashboard/accounts?connected=error&reason=token_exchange_failed`),
    );
  }

  const tokenExpiresAt = longToken.expires_in
    ? new Date(Date.now() + longToken.expires_in * 1000)
    : null;

  let result;
  try {
    result = await completeOAuthAndStoreAccounts({
      brandName: consumed.brandName,
      longLivedUserToken: longToken.access_token,
      tokenExpiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logAudit("ERROR", `account storage failed: ${msg}`);
    return NextResponse.redirect(
      appUrl(`/dashboard/accounts?connected=error&reason=storage_failed`),
    );
  }

  if (result.warnings.length > 0) {
    await logAudit("WARN", result.warnings.join(" | "), {
      accounts: result.accountsCreated,
    });
  }
  await logAudit(
    "OK",
    `connected ${result.accountsCreated.length} IG account(s) for brand ${consumed.brandName}`,
    { accounts: result.accountsCreated },
  );

  return NextResponse.redirect(
    appUrl(
      `/dashboard/accounts?connected=success&brand=${encodeURIComponent(
        consumed.brandName,
      )}&count=${result.accountsCreated.length}`,
    ),
  );
}

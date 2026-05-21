import { requireAdmin } from "@/lib/auth";
import {
  badRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import {
  findById,
} from "@/server/repo/social-account";
import { listBySocialAccount as listMediaForAccount } from "@/server/repo/instagram-media";
import { listBySocialAccount as listCommentsForAccount } from "@/server/repo/instagram-comment";
import { listForSocialAccount as listMetricsForAccount } from "@/server/repo/media-metric";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }
  const { id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return badRequest("Invalid account id");
  }

  const account = await findById(accountId);
  if (!account) return notFound("Account not found");

  // Strip the encrypted tokens from the response — never expose.
  const safeAccount = {
    id: account.id,
    brandName: account.brandName,
    platform: account.platform,
    igUserId: account.igUserId,
    pageId: account.pageId,
    pageName: account.pageName,
    username: account.username,
    name: account.name,
    profilePictureUrl: account.profilePictureUrl,
    followersCount: account.followersCount,
    followsCount: account.followsCount,
    mediaCount: account.mediaCount,
    accountType: account.accountType,
    tokenStatus: account.tokenStatus,
    tokenExpiresAt: account.tokenExpiresAt,
    lastProfileSyncAt: account.lastProfileSyncAt,
    lastMediaSyncAt: account.lastMediaSyncAt,
    lastInsightSyncAt: account.lastInsightSyncAt,
    lastCommentSyncAt: account.lastCommentSyncAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };

  const [media, comments, metrics] = await Promise.all([
    listMediaForAccount(accountId, 20),
    listCommentsForAccount(accountId, 20),
    listMetricsForAccount(accountId, 20),
  ]);

  return ok({ account: safeAccount, media, comments, metrics });
}

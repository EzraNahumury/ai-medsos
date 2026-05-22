import { execute, query, queryOne, toBool, toDate, toJsonParam } from "@/lib/db";

export type InstagramCommentRow = {
  id: number;
  socialAccountId: number | null;
  instagramMediaId: number | null;
  igCommentId: string;
  parentCommentId: string | null;
  username: string | null;
  text: string | null;
  likeCount: number | null;
  timestamp: Date | null;
  sentiment: string;
  intent: string;
  suggestedReply: string | null;
  needsHumanReview: boolean;
  aiAnalyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertCommentInput = {
  socialAccountId: number | null;
  instagramMediaId: number | null;
  igCommentId: string;
  parentCommentId?: string | null;
  username?: string | null;
  text?: string | null;
  likeCount?: number | null;
  timestamp?: Date | null;
  rawJson?: unknown;
};

export async function upsertByIgCommentId(
  input: UpsertCommentInput,
): Promise<void> {
  await execute(
    `INSERT INTO \`InstagramComment\`
       (\`socialAccountId\`, \`instagramMediaId\`, \`igCommentId\`, \`parentCommentId\`, \`username\`, \`text\`,
        \`likeCount\`, \`timestamp\`, \`rawJson\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       \`socialAccountId\` = COALESCE(VALUES(\`socialAccountId\`), \`socialAccountId\`),
       \`instagramMediaId\` = COALESCE(VALUES(\`instagramMediaId\`), \`instagramMediaId\`),
       \`parentCommentId\` = COALESCE(VALUES(\`parentCommentId\`), \`parentCommentId\`),
       \`username\` = VALUES(\`username\`),
       \`text\` = VALUES(\`text\`),
       \`likeCount\` = VALUES(\`likeCount\`),
       \`timestamp\` = VALUES(\`timestamp\`),
       \`rawJson\` = VALUES(\`rawJson\`)`,
    [
      input.socialAccountId ?? null,
      input.instagramMediaId ?? null,
      input.igCommentId,
      input.parentCommentId ?? null,
      input.username ?? null,
      input.text ?? null,
      input.likeCount ?? null,
      input.timestamp ?? null,
      toJsonParam(input.rawJson),
    ],
  );
}

export async function listBySocialAccount(
  socialAccountId: number,
  limit = 20,
): Promise<
  Array<{
    id: number;
    igCommentId: string;
    username: string | null;
    text: string | null;
    timestamp: Date | null;
    likeCount: number | null;
    instagramMediaId: number | null;
    sentiment: string;
    intent: string;
  }>
> {
  const rows = await query<{
    id: number;
    igCommentId: string;
    username: string | null;
    text: string | null;
    timestamp: unknown;
    likeCount: number | null;
    instagramMediaId: number | null;
    sentiment: string;
    intent: string;
  }>(
    "SELECT `id`, `igCommentId`, `username`, `text`, `timestamp`, `likeCount`, `instagramMediaId`, `sentiment`, `intent` " +
      "FROM `InstagramComment` WHERE `socialAccountId` = ? ORDER BY `timestamp` DESC LIMIT " +
      (Number(limit) | 0),
    [socialAccountId],
  );
  return rows.map((r) => ({ ...r, timestamp: toDate(r.timestamp) }));
}

export async function listRecentForDashboard(limit = 15): Promise<
  Array<{
    id: number;
    igCommentId: string;
    username: string | null;
    text: string | null;
    timestamp: Date | null;
    likeCount: number | null;
    instagramMediaId: number | null;
    socialAccountId: number | null;
    socialAccountBrandName: string | null;
  }>
> {
  const rows = await query<{
    id: number;
    igCommentId: string;
    username: string | null;
    text: string | null;
    timestamp: unknown;
    likeCount: number | null;
    instagramMediaId: number | null;
    socialAccountId: number | null;
    saBrand: string | null;
  }>(
    "SELECT c.`id`, c.`igCommentId`, c.`username`, c.`text`, c.`timestamp`, c.`likeCount`, " +
      "c.`instagramMediaId`, c.`socialAccountId`, s.`brandName` AS saBrand " +
      "FROM `InstagramComment` c LEFT JOIN `SocialAccount` s ON s.`id` = c.`socialAccountId` " +
      "ORDER BY c.`createdAt` DESC LIMIT " +
      (Number(limit) | 0),
  );
  return rows.map((r) => ({
    id: r.id,
    igCommentId: r.igCommentId,
    username: r.username,
    text: r.text,
    timestamp: toDate(r.timestamp),
    likeCount: r.likeCount,
    instagramMediaId: r.instagramMediaId,
    socialAccountId: r.socialAccountId,
    socialAccountBrandName: r.saBrand,
  }));
}

export async function listAllForDashboard(
  brand?: string,
  limit = 200,
): Promise<
  Array<{
    id: number;
    igCommentId: string;
    username: string | null;
    text: string | null;
    timestamp: Date | null;
    likeCount: number | null;
    sentiment: string;
    intent: string;
    needsHumanReview: boolean;
    instagramMediaId: number | null;
    socialAccountId: number | null;
    socialAccountBrandName: string | null;
    socialAccountUsername: string | null;
    mediaIgMediaId: string | null;
    mediaPermalink: string | null;
    mediaType: string | null;
  }>
> {
  const where = brand ? "WHERE s.`brandName` = ?" : "";
  const params = brand ? [brand] : [];
  const rows = await query<{
    id: number;
    igCommentId: string;
    username: string | null;
    text: string | null;
    timestamp: unknown;
    likeCount: number | null;
    sentiment: string;
    intent: string;
    needsHumanReview: number;
    instagramMediaId: number | null;
    socialAccountId: number | null;
    saBrand: string | null;
    saUser: string | null;
    mIgMediaId: string | null;
    mPermalink: string | null;
    mType: string | null;
  }>(
    `SELECT c.\`id\`, c.\`igCommentId\`, c.\`username\`, c.\`text\`, c.\`timestamp\`, c.\`likeCount\`,
            c.\`sentiment\`, c.\`intent\`, c.\`needsHumanReview\`, c.\`instagramMediaId\`, c.\`socialAccountId\`,
            s.\`brandName\` AS saBrand, s.\`username\` AS saUser,
            m.\`igMediaId\` AS mIgMediaId, m.\`permalink\` AS mPermalink, m.\`mediaType\` AS mType
       FROM \`InstagramComment\` c
       LEFT JOIN \`SocialAccount\` s ON s.\`id\` = c.\`socialAccountId\`
       LEFT JOIN \`InstagramMedia\` m ON m.\`id\` = c.\`instagramMediaId\`
       ${where}
      ORDER BY c.\`timestamp\` DESC
      LIMIT ${Number(limit) | 0}`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    igCommentId: r.igCommentId,
    username: r.username,
    text: r.text,
    timestamp: toDate(r.timestamp),
    likeCount: r.likeCount,
    sentiment: r.sentiment,
    intent: r.intent,
    needsHumanReview: toBool(r.needsHumanReview),
    instagramMediaId: r.instagramMediaId,
    socialAccountId: r.socialAccountId,
    socialAccountBrandName: r.saBrand,
    socialAccountUsername: r.saUser,
    mediaIgMediaId: r.mIgMediaId,
    mediaPermalink: r.mPermalink,
    mediaType: r.mType,
  }));
}

export async function count(): Promise<number> {
  const row = await queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM `InstagramComment`",
  );
  return row?.c ?? 0;
}

/** Returns total count per brandName (rows for brands with 0 comments are omitted). */
export async function countByBrand(): Promise<Record<string, number>> {
  const rows = await query<{ brand: string; c: number }>(
    "SELECT s.`brandName` AS brand, COUNT(*) AS c " +
      "FROM `InstagramComment` c LEFT JOIN `SocialAccount` s ON s.`id` = c.`socialAccountId` " +
      "WHERE s.`brandName` IS NOT NULL " +
      "GROUP BY s.`brandName`",
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.brand] = r.c;
  return out;
}

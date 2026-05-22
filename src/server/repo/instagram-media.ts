import { execute, parseJsonColumn, query, queryOne, toDate, toJsonParam } from "@/lib/db";

export type InstagramMediaRow = {
  id: number;
  socialAccountId: number;
  igMediaId: string;
  mediaType: string | null;
  mediaProductType: string | null;
  caption: string | null;
  permalink: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  timestamp: Date | null;
  username: string | null;
  likeCount: number | null;
  commentsCount: number | null;
  rawJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type Raw = Omit<InstagramMediaRow, "timestamp" | "createdAt" | "updatedAt" | "rawJson"> & {
  timestamp: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  rawJson: unknown;
};

const COLS =
  "`id`, `socialAccountId`, `igMediaId`, `mediaType`, `mediaProductType`, `caption`, `permalink`, " +
  "`mediaUrl`, `thumbnailUrl`, `timestamp`, `username`, `likeCount`, `commentsCount`, `rawJson`, " +
  "`createdAt`, `updatedAt`";

function mapRow(r: Raw): InstagramMediaRow {
  return {
    id: r.id,
    socialAccountId: r.socialAccountId,
    igMediaId: r.igMediaId,
    mediaType: r.mediaType,
    mediaProductType: r.mediaProductType,
    caption: r.caption,
    permalink: r.permalink,
    mediaUrl: r.mediaUrl,
    thumbnailUrl: r.thumbnailUrl,
    timestamp: toDate(r.timestamp),
    username: r.username,
    likeCount: r.likeCount,
    commentsCount: r.commentsCount,
    rawJson: parseJsonColumn(r.rawJson),
    createdAt: toDate(r.createdAt) ?? new Date(0),
    updatedAt: toDate(r.updatedAt) ?? new Date(0),
  };
}

export type UpsertMediaInput = {
  socialAccountId: number;
  igMediaId: string;
  mediaType?: string | null;
  mediaProductType?: string | null;
  caption?: string | null;
  permalink?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  timestamp?: Date | null;
  username?: string | null;
  likeCount?: number | null;
  commentsCount?: number | null;
  rawJson?: unknown;
};

export async function upsertByIgMediaId(
  input: UpsertMediaInput,
): Promise<{ id: number }> {
  await execute(
    `INSERT INTO \`InstagramMedia\`
       (\`socialAccountId\`, \`igMediaId\`, \`mediaType\`, \`mediaProductType\`, \`caption\`, \`permalink\`,
        \`mediaUrl\`, \`thumbnailUrl\`, \`timestamp\`, \`username\`, \`likeCount\`, \`commentsCount\`, \`rawJson\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       \`socialAccountId\` = VALUES(\`socialAccountId\`),
       \`mediaType\` = VALUES(\`mediaType\`),
       \`mediaProductType\` = VALUES(\`mediaProductType\`),
       \`caption\` = VALUES(\`caption\`),
       \`permalink\` = VALUES(\`permalink\`),
       \`mediaUrl\` = VALUES(\`mediaUrl\`),
       \`thumbnailUrl\` = VALUES(\`thumbnailUrl\`),
       \`timestamp\` = VALUES(\`timestamp\`),
       \`username\` = VALUES(\`username\`),
       \`likeCount\` = VALUES(\`likeCount\`),
       \`commentsCount\` = VALUES(\`commentsCount\`),
       \`rawJson\` = VALUES(\`rawJson\`)`,
    [
      input.socialAccountId,
      input.igMediaId,
      input.mediaType ?? null,
      input.mediaProductType ?? null,
      input.caption ?? null,
      input.permalink ?? null,
      input.mediaUrl ?? null,
      input.thumbnailUrl ?? null,
      input.timestamp ?? null,
      input.username ?? null,
      input.likeCount ?? null,
      input.commentsCount ?? null,
      toJsonParam(input.rawJson),
    ],
  );
  const row = await queryOne<{ id: number }>(
    "SELECT `id` FROM `InstagramMedia` WHERE `igMediaId` = ?",
    [input.igMediaId],
  );
  if (!row) throw new Error("upsertByIgMediaId: row not found");
  return { id: row.id };
}

export async function findByIgMediaId(
  igMediaId: string,
): Promise<InstagramMediaRow | null> {
  const row = await queryOne<Raw>(
    `SELECT ${COLS} FROM \`InstagramMedia\` WHERE \`igMediaId\` = ?`,
    [igMediaId],
  );
  return row ? mapRow(row) : null;
}

export async function listBySocialAccount(
  socialAccountId: number,
  limit = 50,
): Promise<InstagramMediaRow[]> {
  const rows = await query<Raw>(
    `SELECT ${COLS} FROM \`InstagramMedia\` WHERE \`socialAccountId\` = ? ORDER BY \`timestamp\` DESC LIMIT ${Number(limit) | 0}`,
    [socialAccountId],
  );
  return rows.map(mapRow);
}

export async function listRecentByCreatedAt(limit = 12): Promise<
  Array<{
    id: number;
    igMediaId: string;
    mediaType: string | null;
    caption: string | null;
    permalink: string | null;
    thumbnailUrl: string | null;
    timestamp: Date | null;
    likeCount: number | null;
    commentsCount: number | null;
    socialAccountId: number;
    socialAccountBrandName: string | null;
    socialAccountUsername: string | null;
  }>
> {
  const rows = await query<{
    id: number;
    igMediaId: string;
    mediaType: string | null;
    caption: string | null;
    permalink: string | null;
    thumbnailUrl: string | null;
    timestamp: unknown;
    likeCount: number | null;
    commentsCount: number | null;
    socialAccountId: number;
    saBrand: string | null;
    saUser: string | null;
  }>(
    `SELECT m.\`id\`, m.\`igMediaId\`, m.\`mediaType\`, m.\`caption\`, m.\`permalink\`, m.\`thumbnailUrl\`,
            m.\`timestamp\`, m.\`likeCount\`, m.\`commentsCount\`, m.\`socialAccountId\`,
            s.\`brandName\` AS saBrand, s.\`username\` AS saUser
       FROM \`InstagramMedia\` m
       LEFT JOIN \`SocialAccount\` s ON s.\`id\` = m.\`socialAccountId\`
      ORDER BY m.\`createdAt\` DESC
      LIMIT ${Number(limit) | 0}`,
  );
  return rows.map((r) => ({
    id: r.id,
    igMediaId: r.igMediaId,
    mediaType: r.mediaType,
    caption: r.caption,
    permalink: r.permalink,
    thumbnailUrl: r.thumbnailUrl,
    timestamp: toDate(r.timestamp),
    likeCount: r.likeCount,
    commentsCount: r.commentsCount,
    socialAccountId: r.socialAccountId,
    socialAccountBrandName: r.saBrand,
    socialAccountUsername: r.saUser,
  }));
}

export async function listAllForDashboard(
  brand?: string,
  limit = 200,
): Promise<
  Array<{
    id: number;
    igMediaId: string;
    mediaType: string | null;
    mediaProductType: string | null;
    caption: string | null;
    permalink: string | null;
    thumbnailUrl: string | null;
    mediaUrl: string | null;
    timestamp: Date | null;
    username: string | null;
    likeCount: number | null;
    commentsCount: number | null;
    socialAccountId: number;
    socialAccountBrandName: string | null;
    socialAccountUsername: string | null;
  }>
> {
  const where = brand ? "WHERE s.`brandName` = ?" : "";
  const params = brand ? [brand] : [];
  const rows = await query<{
    id: number;
    igMediaId: string;
    mediaType: string | null;
    mediaProductType: string | null;
    caption: string | null;
    permalink: string | null;
    thumbnailUrl: string | null;
    mediaUrl: string | null;
    timestamp: unknown;
    username: string | null;
    likeCount: number | null;
    commentsCount: number | null;
    socialAccountId: number;
    saBrand: string | null;
    saUser: string | null;
  }>(
    `SELECT m.\`id\`, m.\`igMediaId\`, m.\`mediaType\`, m.\`mediaProductType\`, m.\`caption\`, m.\`permalink\`,
            m.\`thumbnailUrl\`, m.\`mediaUrl\`, m.\`timestamp\`, m.\`username\`, m.\`likeCount\`, m.\`commentsCount\`,
            m.\`socialAccountId\`, s.\`brandName\` AS saBrand, s.\`username\` AS saUser
       FROM \`InstagramMedia\` m
       LEFT JOIN \`SocialAccount\` s ON s.\`id\` = m.\`socialAccountId\`
       ${where}
      ORDER BY m.\`timestamp\` DESC
      LIMIT ${Number(limit) | 0}`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    igMediaId: r.igMediaId,
    mediaType: r.mediaType,
    mediaProductType: r.mediaProductType,
    caption: r.caption,
    permalink: r.permalink,
    thumbnailUrl: r.thumbnailUrl,
    mediaUrl: r.mediaUrl,
    timestamp: toDate(r.timestamp),
    username: r.username,
    likeCount: r.likeCount,
    commentsCount: r.commentsCount,
    socialAccountId: r.socialAccountId,
    socialAccountBrandName: r.saBrand,
    socialAccountUsername: r.saUser,
  }));
}

export async function count(): Promise<number> {
  const row = await queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM `InstagramMedia`",
  );
  return row?.c ?? 0;
}

/** Returns total count per brandName (rows for brands with 0 media are omitted). */
export async function countByBrand(): Promise<Record<string, number>> {
  const rows = await query<{ brand: string; c: number }>(
    "SELECT s.`brandName` AS brand, COUNT(*) AS c " +
      "FROM `InstagramMedia` m LEFT JOIN `SocialAccount` s ON s.`id` = m.`socialAccountId` " +
      "WHERE s.`brandName` IS NOT NULL " +
      "GROUP BY s.`brandName`",
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.brand] = r.c;
  return out;
}

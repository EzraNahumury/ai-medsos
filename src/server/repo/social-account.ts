import { execute, parseJsonColumn, query, queryOne, toDate, toJsonParam } from "@/lib/db";

export type SocialAccountRow = {
  id: number;
  brandName: string;
  platform: string;
  igUserId: string;
  pageId: string | null;
  pageName: string | null;
  username: string | null;
  name: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  accountType: string | null;
  encryptedPageAccessToken: string;
  encryptedUserAccessToken: string | null;
  tokenExpiresAt: Date | null;
  tokenStatus: string;
  scopes: string[] | null;
  lastProfileSyncAt: Date | null;
  lastMediaSyncAt: Date | null;
  lastInsightSyncAt: Date | null;
  lastCommentSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Raw = Omit<
  SocialAccountRow,
  | "scopes"
  | "tokenExpiresAt"
  | "lastProfileSyncAt"
  | "lastMediaSyncAt"
  | "lastInsightSyncAt"
  | "lastCommentSyncAt"
  | "createdAt"
  | "updatedAt"
> & {
  scopes: unknown;
  tokenExpiresAt: unknown;
  lastProfileSyncAt: unknown;
  lastMediaSyncAt: unknown;
  lastInsightSyncAt: unknown;
  lastCommentSyncAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
};

const SELECT_COLS =
  "`id`, `brandName`, `platform`, `igUserId`, `pageId`, `pageName`, `username`, `name`, `profilePictureUrl`, " +
  "`followersCount`, `followsCount`, `mediaCount`, `accountType`, `encryptedPageAccessToken`, `encryptedUserAccessToken`, " +
  "`tokenExpiresAt`, `tokenStatus`, `scopes`, `lastProfileSyncAt`, `lastMediaSyncAt`, `lastInsightSyncAt`, `lastCommentSyncAt`, " +
  "`createdAt`, `updatedAt`";

function mapRow(r: Raw): SocialAccountRow {
  return {
    id: r.id,
    brandName: r.brandName,
    platform: r.platform,
    igUserId: r.igUserId,
    pageId: r.pageId,
    pageName: r.pageName,
    username: r.username,
    name: r.name,
    profilePictureUrl: r.profilePictureUrl,
    followersCount: r.followersCount,
    followsCount: r.followsCount,
    mediaCount: r.mediaCount,
    accountType: r.accountType,
    encryptedPageAccessToken: r.encryptedPageAccessToken,
    encryptedUserAccessToken: r.encryptedUserAccessToken,
    tokenExpiresAt: toDate(r.tokenExpiresAt),
    tokenStatus: r.tokenStatus,
    scopes: parseJsonColumn<string[]>(r.scopes),
    lastProfileSyncAt: toDate(r.lastProfileSyncAt),
    lastMediaSyncAt: toDate(r.lastMediaSyncAt),
    lastInsightSyncAt: toDate(r.lastInsightSyncAt),
    lastCommentSyncAt: toDate(r.lastCommentSyncAt),
    createdAt: toDate(r.createdAt) ?? new Date(0),
    updatedAt: toDate(r.updatedAt) ?? new Date(0),
  };
}

export async function findById(id: number): Promise<SocialAccountRow | null> {
  const row = await queryOne<Raw>(
    `SELECT ${SELECT_COLS} FROM \`SocialAccount\` WHERE \`id\` = ?`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function findByIgUserId(
  igUserId: string,
): Promise<SocialAccountRow | null> {
  const row = await queryOne<Raw>(
    `SELECT ${SELECT_COLS} FROM \`SocialAccount\` WHERE \`igUserId\` = ?`,
    [igUserId],
  );
  return row ? mapRow(row) : null;
}

export async function listAll(): Promise<SocialAccountRow[]> {
  const rows = await query<Raw>(
    `SELECT ${SELECT_COLS} FROM \`SocialAccount\` ORDER BY \`brandName\` ASC, \`id\` ASC`,
  );
  return rows.map(mapRow);
}

export async function findFirstActive(): Promise<SocialAccountRow | null> {
  const row = await queryOne<Raw>(
    `SELECT ${SELECT_COLS} FROM \`SocialAccount\` WHERE \`tokenStatus\` = 'ACTIVE' ORDER BY \`id\` ASC LIMIT 1`,
  );
  return row ? mapRow(row) : null;
}

export async function count(): Promise<number> {
  const row = await queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM `SocialAccount`",
  );
  return row?.c ?? 0;
}

export type UpsertInput = {
  brandName: string;
  platform?: string;
  igUserId: string;
  pageId?: string | null;
  pageName?: string | null;
  username?: string | null;
  name?: string | null;
  profilePictureUrl?: string | null;
  encryptedPageAccessToken: string;
  encryptedUserAccessToken?: string | null;
  tokenExpiresAt?: Date | null;
  tokenStatus?: string;
  scopes?: string[] | null;
};

/**
 * Insert-or-update on `igUserId`. Returns the row id.
 */
export async function upsertByIgUserId(input: UpsertInput): Promise<number> {
  await execute(
    `INSERT INTO \`SocialAccount\`
       (\`brandName\`, \`platform\`, \`igUserId\`, \`pageId\`, \`pageName\`, \`username\`, \`name\`, \`profilePictureUrl\`,
        \`encryptedPageAccessToken\`, \`encryptedUserAccessToken\`, \`tokenExpiresAt\`, \`tokenStatus\`, \`scopes\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       \`brandName\` = VALUES(\`brandName\`),
       \`platform\` = VALUES(\`platform\`),
       \`pageId\` = VALUES(\`pageId\`),
       \`pageName\` = VALUES(\`pageName\`),
       \`username\` = COALESCE(VALUES(\`username\`), \`username\`),
       \`name\` = COALESCE(VALUES(\`name\`), \`name\`),
       \`profilePictureUrl\` = COALESCE(VALUES(\`profilePictureUrl\`), \`profilePictureUrl\`),
       \`encryptedPageAccessToken\` = VALUES(\`encryptedPageAccessToken\`),
       \`encryptedUserAccessToken\` = COALESCE(VALUES(\`encryptedUserAccessToken\`), \`encryptedUserAccessToken\`),
       \`tokenExpiresAt\` = VALUES(\`tokenExpiresAt\`),
       \`tokenStatus\` = VALUES(\`tokenStatus\`),
       \`scopes\` = COALESCE(VALUES(\`scopes\`), \`scopes\`)`,
    [
      input.brandName,
      input.platform ?? "INSTAGRAM",
      input.igUserId,
      input.pageId ?? null,
      input.pageName ?? null,
      input.username ?? null,
      input.name ?? null,
      input.profilePictureUrl ?? null,
      input.encryptedPageAccessToken,
      input.encryptedUserAccessToken ?? null,
      input.tokenExpiresAt ?? null,
      input.tokenStatus ?? "ACTIVE",
      toJsonParam(input.scopes ?? null),
    ],
  );
  const row = await queryOne<{ id: number }>(
    "SELECT `id` FROM `SocialAccount` WHERE `igUserId` = ?",
    [input.igUserId],
  );
  if (!row) throw new Error("upsertByIgUserId: row not found after upsert");
  return row.id;
}

export type ProfileSyncPatch = {
  username?: string | null;
  name?: string | null;
  profilePictureUrl?: string | null;
  followersCount?: number | null;
  followsCount?: number | null;
  mediaCount?: number | null;
  accountType?: string | null;
};

export async function updateProfileSync(
  id: number,
  patch: ProfileSyncPatch,
): Promise<void> {
  await execute(
    `UPDATE \`SocialAccount\` SET
       \`username\` = COALESCE(?, \`username\`),
       \`name\` = COALESCE(?, \`name\`),
       \`profilePictureUrl\` = COALESCE(?, \`profilePictureUrl\`),
       \`followersCount\` = COALESCE(?, \`followersCount\`),
       \`followsCount\` = COALESCE(?, \`followsCount\`),
       \`mediaCount\` = COALESCE(?, \`mediaCount\`),
       \`accountType\` = COALESCE(?, \`accountType\`),
       \`lastProfileSyncAt\` = NOW()
     WHERE \`id\` = ?`,
    [
      patch.username ?? null,
      patch.name ?? null,
      patch.profilePictureUrl ?? null,
      patch.followersCount ?? null,
      patch.followsCount ?? null,
      patch.mediaCount ?? null,
      patch.accountType ?? null,
      id,
    ],
  );
}

export async function touchLastSync(
  id: number,
  field:
    | "lastProfileSyncAt"
    | "lastMediaSyncAt"
    | "lastInsightSyncAt"
    | "lastCommentSyncAt",
): Promise<void> {
  await execute(
    `UPDATE \`SocialAccount\` SET \`${field}\` = NOW() WHERE \`id\` = ?`,
    [id],
  );
}

export async function updateTokenStatus(
  id: number,
  status: string,
): Promise<void> {
  await execute(
    "UPDATE `SocialAccount` SET `tokenStatus` = ? WHERE `id` = ?",
    [status, id],
  );
}

// ---- Listing for dashboards ----
export type ListedAccount = {
  id: number;
  brandName: string;
  username: string | null;
  igUserId: string;
  pageId: string | null;
  pageName: string | null;
  tokenStatus: string;
  tokenExpiresAt: Date | null;
  followersCount: number | null;
  mediaCount: number | null;
  lastProfileSyncAt: Date | null;
  lastMediaSyncAt: Date | null;
  lastInsightSyncAt: Date | null;
  lastCommentSyncAt: Date | null;
};

export async function listForDashboard(): Promise<ListedAccount[]> {
  const rows = await query<{
    id: number;
    brandName: string;
    username: string | null;
    igUserId: string;
    pageId: string | null;
    pageName: string | null;
    tokenStatus: string;
    tokenExpiresAt: unknown;
    followersCount: number | null;
    mediaCount: number | null;
    lastProfileSyncAt: unknown;
    lastMediaSyncAt: unknown;
    lastInsightSyncAt: unknown;
    lastCommentSyncAt: unknown;
  }>(
    "SELECT `id`, `brandName`, `username`, `igUserId`, `pageId`, `pageName`, `tokenStatus`, `tokenExpiresAt`, " +
      "`followersCount`, `mediaCount`, `lastProfileSyncAt`, `lastMediaSyncAt`, `lastInsightSyncAt`, `lastCommentSyncAt` " +
      "FROM `SocialAccount` ORDER BY `brandName` ASC, `id` ASC",
  );
  return rows.map((r) => ({
    id: r.id,
    brandName: r.brandName,
    username: r.username,
    igUserId: r.igUserId,
    pageId: r.pageId,
    pageName: r.pageName,
    tokenStatus: r.tokenStatus,
    tokenExpiresAt: toDate(r.tokenExpiresAt),
    followersCount: r.followersCount,
    mediaCount: r.mediaCount,
    lastProfileSyncAt: toDate(r.lastProfileSyncAt),
    lastMediaSyncAt: toDate(r.lastMediaSyncAt),
    lastInsightSyncAt: toDate(r.lastInsightSyncAt),
    lastCommentSyncAt: toDate(r.lastCommentSyncAt),
  }));
}

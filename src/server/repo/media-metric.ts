import { execute, query, toDate, toJsonParam } from "@/lib/db";

export type CreateSnapshotInput = {
  instagramMediaId: number;
  views?: number | null;
  plays?: number | null;
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  totalInteractions?: number | null;
  engagementRate?: number | null;
  rawJson?: unknown;
};

export async function createSnapshot(input: CreateSnapshotInput): Promise<void> {
  await execute(
    `INSERT INTO \`MediaMetricSnapshot\`
       (\`instagramMediaId\`, \`views\`, \`plays\`, \`reach\`, \`impressions\`, \`likes\`, \`comments\`,
        \`shares\`, \`saves\`, \`totalInteractions\`, \`engagementRate\`, \`rawJson\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.instagramMediaId,
      input.views ?? null,
      input.plays ?? null,
      input.reach ?? null,
      input.impressions ?? null,
      input.likes ?? null,
      input.comments ?? null,
      input.shares ?? null,
      input.saves ?? null,
      input.totalInteractions ?? null,
      input.engagementRate ?? null,
      toJsonParam(input.rawJson),
    ],
  );
}

export type SnapshotRow = {
  id: number;
  instagramMediaId: number;
  views: number | null;
  plays: number | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  totalInteractions: number | null;
  engagementRate: number | null;
  collectedAt: Date;
};

type Raw = Omit<SnapshotRow, "collectedAt"> & { collectedAt: unknown };

const COLS =
  "`id`, `instagramMediaId`, `views`, `plays`, `reach`, `impressions`, `likes`, `comments`, " +
  "`shares`, `saves`, `totalInteractions`, `engagementRate`, `collectedAt`";

function mapRow(r: Raw): SnapshotRow {
  return { ...r, collectedAt: toDate(r.collectedAt) ?? new Date(0) };
}

export async function listForMediaSet(
  mediaIds: number[],
  limit = 20,
): Promise<SnapshotRow[]> {
  if (mediaIds.length === 0) return [];
  const placeholders = mediaIds.map(() => "?").join(",");
  const rows = await query<Raw>(
    `SELECT ${COLS} FROM \`MediaMetricSnapshot\`
       WHERE \`instagramMediaId\` IN (${placeholders})
       ORDER BY \`collectedAt\` DESC LIMIT ${Number(limit) | 0}`,
    mediaIds,
  );
  return rows.map(mapRow);
}

export async function listRecent(limit = 12): Promise<SnapshotRow[]> {
  const rows = await query<Raw>(
    `SELECT ${COLS} FROM \`MediaMetricSnapshot\` ORDER BY \`collectedAt\` DESC LIMIT ${Number(limit) | 0}`,
  );
  return rows.map(mapRow);
}

export async function listForSocialAccount(
  socialAccountId: number,
  limit = 20,
): Promise<SnapshotRow[]> {
  const rows = await query<Raw>(
    `SELECT ${COLS} FROM \`MediaMetricSnapshot\`
       WHERE \`instagramMediaId\` IN (SELECT \`id\` FROM \`InstagramMedia\` WHERE \`socialAccountId\` = ?)
       ORDER BY \`collectedAt\` DESC LIMIT ${Number(limit) | 0}`,
    [socialAccountId],
  );
  return rows.map(mapRow);
}

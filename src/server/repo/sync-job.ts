import { execute, query, toDate, toJsonParam } from "@/lib/db";

export type SyncJobRow = {
  id: number;
  jobType: string;
  socialAccountId: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

type Raw = Omit<SyncJobRow, "createdAt" | "startedAt" | "finishedAt"> & {
  createdAt: unknown;
  startedAt: unknown;
  finishedAt: unknown;
};

export async function createJob(input: {
  jobType: string;
  socialAccountId?: number | null;
  status?: string;
  startedAt?: Date | null;
}): Promise<number> {
  const r = await execute(
    "INSERT INTO `SyncJob` (`jobType`, `socialAccountId`, `status`, `startedAt`) VALUES (?, ?, ?, ?)",
    [
      input.jobType,
      input.socialAccountId ?? null,
      input.status ?? "PENDING",
      input.startedAt ?? null,
    ],
  );
  return r.insertId;
}

export async function updateJob(
  id: number,
  patch: {
    status?: string;
    errorMessage?: string | null;
    payload?: unknown;
    finishedAt?: Date | null;
  },
): Promise<void> {
  await execute(
    "UPDATE `SyncJob` SET " +
      "`status` = COALESCE(?, `status`), " +
      "`errorMessage` = ?, " +
      "`payload` = COALESCE(?, `payload`), " +
      "`finishedAt` = ? " +
      "WHERE `id` = ?",
    [
      patch.status ?? null,
      patch.errorMessage ?? null,
      patch.payload === undefined ? null : toJsonParam(patch.payload),
      patch.finishedAt ?? null,
      id,
    ],
  );
}

export async function listRecent(limit = 10): Promise<SyncJobRow[]> {
  const rows = await query<Raw>(
    "SELECT `id`, `jobType`, `socialAccountId`, `status`, `errorMessage`, `createdAt`, `startedAt`, `finishedAt` " +
      "FROM `SyncJob` ORDER BY `createdAt` DESC LIMIT " +
      (Number(limit) | 0),
  );
  return rows.map((r) => ({
    id: r.id,
    jobType: r.jobType,
    socialAccountId: r.socialAccountId,
    status: r.status,
    errorMessage: r.errorMessage,
    createdAt: toDate(r.createdAt) ?? new Date(0),
    startedAt: toDate(r.startedAt),
    finishedAt: toDate(r.finishedAt),
  }));
}

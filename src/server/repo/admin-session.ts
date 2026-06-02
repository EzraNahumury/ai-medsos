import { execute, queryOne, toDate } from "@/lib/db";

export type AdminSessionRow = {
  id: number;
  sessionToken: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
};

type Raw = {
  id: number;
  sessionToken: string;
  email: string;
  expiresAt: unknown;
  createdAt: unknown;
};

function mapRow(r: Raw): AdminSessionRow {
  return {
    id: r.id,
    sessionToken: r.sessionToken,
    email: r.email,
    expiresAt: toDate(r.expiresAt) ?? new Date(0),
    createdAt: toDate(r.createdAt) ?? new Date(0),
  };
}

export async function createSession(input: {
  sessionToken: string;
  email: string;
  expiresAt: Date;
}): Promise<void> {
  await execute(
    "INSERT INTO `adminsession` (`sessionToken`, `email`, `expiresAt`) VALUES (?, ?, ?)",
    [input.sessionToken, input.email, input.expiresAt],
  );
}

export async function findBySessionToken(
  sessionToken: string,
): Promise<AdminSessionRow | null> {
  const row = await queryOne<Raw>(
    "SELECT `id`, `sessionToken`, `email`, `expiresAt`, `createdAt` FROM `adminsession` WHERE `sessionToken` = ?",
    [sessionToken],
  );
  return row ? mapRow(row) : null;
}

export async function deleteBySessionToken(sessionToken: string): Promise<void> {
  await execute("DELETE FROM `adminsession` WHERE `sessionToken` = ?", [
    sessionToken,
  ]);
}

export async function deleteExpired(): Promise<number> {
  const r = await execute(
    "DELETE FROM `adminsession` WHERE `expiresAt` < NOW()",
  );
  return r.affectedRows;
}

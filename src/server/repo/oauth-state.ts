import { execute, queryOne, toDate } from "@/lib/db";

export type OAuthStateRow = {
  id: number;
  state: string;
  brandName: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

type Raw = {
  id: number;
  state: string;
  brandName: string;
  expiresAt: unknown;
  usedAt: unknown;
  createdAt: unknown;
};

function mapRow(r: Raw): OAuthStateRow {
  return {
    id: r.id,
    state: r.state,
    brandName: r.brandName,
    expiresAt: toDate(r.expiresAt) ?? new Date(0),
    usedAt: toDate(r.usedAt),
    createdAt: toDate(r.createdAt) ?? new Date(0),
  };
}

export async function createState(input: {
  state: string;
  brandName: string;
  expiresAt: Date;
}): Promise<void> {
  await execute(
    "INSERT INTO `OAuthState` (`state`, `brandName`, `expiresAt`) VALUES (?, ?, ?)",
    [input.state, input.brandName, input.expiresAt],
  );
}

export async function findByState(state: string): Promise<OAuthStateRow | null> {
  const row = await queryOne<Raw>(
    "SELECT `id`, `state`, `brandName`, `expiresAt`, `usedAt`, `createdAt` FROM `OAuthState` WHERE `state` = ?",
    [state],
  );
  return row ? mapRow(row) : null;
}

export async function markStateUsed(state: string): Promise<void> {
  await execute("UPDATE `OAuthState` SET `usedAt` = NOW() WHERE `state` = ?", [
    state,
  ]);
}

import { execute, query, toDate, toJsonParam } from "@/lib/db";

export type AuditLogRow = {
  id: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  status: string;
  message: string | null;
  createdAt: Date;
};

export type CreateAuditInput = {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  status: string;
  message?: string | null;
  metadata?: unknown;
};

export async function createAudit(input: CreateAuditInput): Promise<void> {
  await execute(
    "INSERT INTO `AuditLog` (`actor`, `action`, `entityType`, `entityId`, `status`, `message`, `metadataJson`) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      input.actor,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.status,
      input.message ?? null,
      input.metadata === undefined ? null : toJsonParam(input.metadata),
    ],
  );
}

export async function listRecent(limit = 15): Promise<AuditLogRow[]> {
  const rows = await query<{
    id: number;
    actor: string;
    action: string;
    entityType: string;
    entityId: string | null;
    status: string;
    message: string | null;
    createdAt: unknown;
  }>(
    "SELECT `id`, `actor`, `action`, `entityType`, `entityId`, `status`, `message`, `createdAt` " +
      "FROM `AuditLog` ORDER BY `createdAt` DESC LIMIT " +
      (Number(limit) | 0),
  );
  return rows.map((r) => ({ ...r, createdAt: toDate(r.createdAt) ?? new Date(0) }));
}

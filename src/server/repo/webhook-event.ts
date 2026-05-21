import { execute, parseJsonColumn, query, queryOne, toDate, toJsonParam } from "@/lib/db";

export type WebhookEventRow = {
  id: number;
  eventId: string | null;
  objectType: string | null;
  fieldName: string | null;
  rawPayload: unknown;
  rawBody: string | null;
  processingStatus: string;
  errorMessage: string | null;
  receivedAt: Date;
  processedAt: Date | null;
};

type Raw = Omit<WebhookEventRow, "receivedAt" | "processedAt" | "rawPayload"> & {
  receivedAt: unknown;
  processedAt: unknown;
  rawPayload: unknown;
};

const COLS =
  "`id`, `eventId`, `objectType`, `fieldName`, `rawPayload`, `rawBody`, " +
  "`processingStatus`, `errorMessage`, `receivedAt`, `processedAt`";

function mapRow(r: Raw): WebhookEventRow {
  return {
    id: r.id,
    eventId: r.eventId,
    objectType: r.objectType,
    fieldName: r.fieldName,
    rawPayload: parseJsonColumn(r.rawPayload),
    rawBody: r.rawBody,
    processingStatus: r.processingStatus,
    errorMessage: r.errorMessage,
    receivedAt: toDate(r.receivedAt) ?? new Date(0),
    processedAt: toDate(r.processedAt),
  };
}

export type CreateEventInput = {
  eventId?: string | null;
  objectType?: string | null;
  fieldName?: string | null;
  rawPayload: unknown;
  rawBody?: string | null;
  processingStatus?: string;
  errorMessage?: string | null;
  processedAt?: Date | null;
};

export async function createEvent(input: CreateEventInput): Promise<number> {
  const r = await execute(
    "INSERT INTO `IgWebhookEvent` (`eventId`, `objectType`, `fieldName`, `rawPayload`, `rawBody`, `processingStatus`, `errorMessage`, `processedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      input.eventId ?? null,
      input.objectType ?? null,
      input.fieldName ?? null,
      toJsonParam(input.rawPayload),
      input.rawBody ?? null,
      input.processingStatus ?? "PENDING",
      input.errorMessage ?? null,
      input.processedAt ?? null,
    ],
  );
  return r.insertId;
}

export async function findById(id: number): Promise<WebhookEventRow | null> {
  const row = await queryOne<Raw>(
    `SELECT ${COLS} FROM \`IgWebhookEvent\` WHERE \`id\` = ?`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function listPending(limit = 20): Promise<WebhookEventRow[]> {
  const rows = await query<Raw>(
    `SELECT ${COLS} FROM \`IgWebhookEvent\` WHERE \`processingStatus\` = 'PENDING' ORDER BY \`receivedAt\` ASC LIMIT ${Number(limit) | 0}`,
  );
  return rows.map(mapRow);
}

export async function listRecent(limit = 10): Promise<
  Array<{
    id: number;
    eventId: string | null;
    objectType: string | null;
    fieldName: string | null;
    processingStatus: string;
    errorMessage: string | null;
    receivedAt: Date;
    processedAt: Date | null;
  }>
> {
  const rows = await query<{
    id: number;
    eventId: string | null;
    objectType: string | null;
    fieldName: string | null;
    processingStatus: string;
    errorMessage: string | null;
    receivedAt: unknown;
    processedAt: unknown;
  }>(
    "SELECT `id`, `eventId`, `objectType`, `fieldName`, `processingStatus`, `errorMessage`, `receivedAt`, `processedAt` " +
      "FROM `IgWebhookEvent` ORDER BY `receivedAt` DESC LIMIT " +
      (Number(limit) | 0),
  );
  return rows.map((r) => ({
    ...r,
    receivedAt: toDate(r.receivedAt) ?? new Date(0),
    processedAt: toDate(r.processedAt),
  }));
}

export async function countPending(): Promise<number> {
  const row = await queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM `IgWebhookEvent` WHERE `processingStatus` = 'PENDING'",
  );
  return row?.c ?? 0;
}

export async function updateStatus(
  id: number,
  patch: {
    processingStatus: string;
    errorMessage?: string | null;
    processedAt?: Date | null;
    objectType?: string | null;
    fieldName?: string | null;
  },
): Promise<void> {
  await execute(
    "UPDATE `IgWebhookEvent` SET `processingStatus` = ?, `errorMessage` = ?, `processedAt` = ?, " +
      "`objectType` = COALESCE(?, `objectType`), `fieldName` = COALESCE(?, `fieldName`) " +
      "WHERE `id` = ?",
    [
      patch.processingStatus,
      patch.errorMessage ?? null,
      patch.processedAt ?? null,
      patch.objectType ?? null,
      patch.fieldName ?? null,
      id,
    ],
  );
}

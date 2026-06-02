import {
  execute,
  parseJsonColumn,
  query,
  queryOne,
  toDate,
  toJsonParam,
} from "@/lib/db";

export type AiAgentConversationRow = {
  id: number;
  title: string;
  createdByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ListedAiAgentConversation = AiAgentConversationRow & {
  lastMessageAt: Date | null;
  messageCount: number;
};

export type AiAgentMessageRow = {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  metadata: unknown;
  createdAt: Date;
};

type ConversationRaw = {
  id: number;
  title: string;
  createdByEmail: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  deletedAt: unknown;
};

type ListedConversationRaw = ConversationRaw & {
  lastMessageAt: unknown;
  messageCount: number;
};

type MessageRaw = {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  model: string | null;
  metadataJson: unknown;
  createdAt: unknown;
};

const CONVERSATION_COLS =
  "`id`, `title`, `createdByEmail`, `createdAt`, `updatedAt`, `deletedAt`";

function mapConversation(row: ConversationRaw): AiAgentConversationRow {
  return {
    id: row.id,
    title: row.title,
    createdByEmail: row.createdByEmail,
    createdAt: toDate(row.createdAt) ?? new Date(0),
    updatedAt: toDate(row.updatedAt) ?? new Date(0),
    deletedAt: toDate(row.deletedAt),
  };
}

function mapListedConversation(
  row: ListedConversationRaw,
): ListedAiAgentConversation {
  return {
    ...mapConversation(row),
    lastMessageAt: toDate(row.lastMessageAt),
    messageCount: row.messageCount,
  };
}

function mapMessage(row: MessageRaw): AiAgentMessageRow {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    model: row.model,
    metadata: parseJsonColumn(row.metadataJson),
    createdAt: toDate(row.createdAt) ?? new Date(0),
  };
}

export function titleFromMessage(content: string): string {
  const clean = content.replace(/\s+/g, " ").trim();
  if (!clean) return "Chat Baru";
  return clean.length > 64 ? `${clean.slice(0, 63)}...` : clean;
}

export async function createConversation(input: {
  title: string;
  createdByEmail?: string | null;
}): Promise<AiAgentConversationRow> {
  const result = await execute(
    "INSERT INTO `aiagentconversation` (`title`, `createdByEmail`) VALUES (?, ?)",
    [input.title, input.createdByEmail ?? null],
  );
  const row = await findConversationById(result.insertId);
  if (!row) throw new Error("createConversation: row not found after insert");
  return row;
}

export async function findConversationById(
  id: number,
): Promise<AiAgentConversationRow | null> {
  const row = await queryOne<ConversationRaw>(
    `SELECT ${CONVERSATION_COLS} FROM \`aiagentconversation\` WHERE \`id\` = ? AND \`deletedAt\` IS NULL`,
    [id],
  );
  return row ? mapConversation(row) : null;
}

export async function listConversations(
  limit = 50,
): Promise<ListedAiAgentConversation[]> {
  const rows = await query<ListedConversationRaw>(
    `SELECT c.\`id\`, c.\`title\`, c.\`createdByEmail\`, c.\`createdAt\`, c.\`updatedAt\`, c.\`deletedAt\`,
            MAX(m.\`createdAt\`) AS lastMessageAt,
            COUNT(m.\`id\`) AS messageCount
       FROM \`aiagentconversation\` c
       LEFT JOIN \`aiagentmessage\` m ON m.\`conversationId\` = c.\`id\`
      WHERE c.\`deletedAt\` IS NULL
      GROUP BY c.\`id\`, c.\`title\`, c.\`createdByEmail\`, c.\`createdAt\`, c.\`updatedAt\`, c.\`deletedAt\`
      ORDER BY COALESCE(MAX(m.\`createdAt\`), c.\`updatedAt\`) DESC
      LIMIT ${Number(limit) | 0}`,
  );
  return rows.map(mapListedConversation);
}

export async function softDeleteConversation(id: number): Promise<void> {
  await execute(
    "UPDATE `aiagentconversation` SET `deletedAt` = NOW() WHERE `id` = ?",
    [id],
  );
}

export async function createMessage(input: {
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  metadata?: unknown;
}): Promise<AiAgentMessageRow> {
  const result = await execute(
    "INSERT INTO `aiagentmessage` (`conversationId`, `role`, `content`, `model`, `metadataJson`) VALUES (?, ?, ?, ?, ?)",
    [
      input.conversationId,
      input.role,
      input.content,
      input.model ?? null,
      input.metadata === undefined ? null : toJsonParam(input.metadata),
    ],
  );
  await execute(
    "UPDATE `aiagentconversation` SET `updatedAt` = NOW() WHERE `id` = ?",
    [input.conversationId],
  );
  const row = await queryOne<MessageRaw>(
    "SELECT `id`, `conversationId`, `role`, `content`, `model`, `metadataJson`, `createdAt` FROM `aiagentmessage` WHERE `id` = ?",
    [result.insertId],
  );
  if (!row) throw new Error("createMessage: row not found after insert");
  return mapMessage(row);
}

export async function listMessages(
  conversationId: number,
  limit = 50,
): Promise<AiAgentMessageRow[]> {
  const rows = await query<MessageRaw>(
    `SELECT * FROM (
       SELECT \`id\`, \`conversationId\`, \`role\`, \`content\`, \`model\`, \`metadataJson\`, \`createdAt\`
         FROM \`aiagentmessage\`
        WHERE \`conversationId\` = ?
        ORDER BY \`createdAt\` DESC, \`id\` DESC
        LIMIT ${Number(limit) | 0}
     ) recent
     ORDER BY \`createdAt\` ASC, \`id\` ASC`,
    [conversationId],
  );
  return rows.map(mapMessage);
}

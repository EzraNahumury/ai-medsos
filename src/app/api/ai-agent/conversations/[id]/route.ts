import {
  badRequest,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import {
  findConversationById,
  listMessages,
  softDeleteConversation,
} from "@/server/repo/ai-agent-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }

  const { id } = await ctx.params;
  const conversationId = parseId(id);
  if (!conversationId) return badRequest("Invalid conversation id");

  const conversation = await findConversationById(conversationId);
  if (!conversation) return notFound("Conversation not found");

  const messages = await listMessages(conversationId, 100);
  return ok({ conversation, messages });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }

  const { id } = await ctx.params;
  const conversationId = parseId(id);
  if (!conversationId) return badRequest("Invalid conversation id");

  const conversation = await findConversationById(conversationId);
  if (!conversation) return notFound("Conversation not found");

  await softDeleteConversation(conversationId);
  return ok({ deleted: true });
}

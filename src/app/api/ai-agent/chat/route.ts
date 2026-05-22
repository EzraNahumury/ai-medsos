import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { runInstagramAgentChat } from "@/server/ai/instagram-agent";
import {
  createConversation,
  createMessage,
  findConversationById,
  listMessages,
  titleFromMessage,
} from "@/server/repo/ai-agent-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

const Body = z.object({
  conversationId: z.number().int().positive().nullable().optional(),
  message: z.string().min(1).max(6000).optional(),
  messages: z.array(Message).min(1).max(20).optional(),
});

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return unauthorized();
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid chat payload", parsed.error.issues);
  }

  const last =
    parsed.data.message !== undefined
      ? { role: "user" as const, content: parsed.data.message }
      : parsed.data.messages?.[parsed.data.messages.length - 1];
  if (!last) {
    return badRequest("Message is required");
  }
  if (last.role !== "user") {
    return badRequest("Last message must be from user");
  }

  try {
    const conversation =
      parsed.data.conversationId === null || parsed.data.conversationId === undefined
        ? await createConversation({
            title: titleFromMessage(last.content),
            createdByEmail: admin.email,
          })
        : await findConversationById(parsed.data.conversationId);

    if (!conversation) return notFound("Conversation not found");

    const previousMessages = await listMessages(conversation.id, 20);
    const userMessage = await createMessage({
      conversationId: conversation.id,
      role: "user",
      content: last.content,
    });

    const history = [
      ...previousMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: "user" as const, content: userMessage.content },
    ];

    const result = await runInstagramAgentChat(history);
    const assistantMessage = await createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: result.content,
      model: result.requestModel,
      metadata: {
        configuredModel: result.configuredModel,
        host: result.host,
        contextGeneratedAt: result.contextGeneratedAt,
      },
    });

    return ok({
      conversation,
      messages: [userMessage, assistantMessage],
      reply: {
        role: "assistant",
        content: result.content,
      },
      model: result.configuredModel,
      requestModel: result.requestModel,
      host: result.host,
      contextGeneratedAt: result.contextGeneratedAt,
    });
  } catch (err) {
    return serverError(
      "AI agent failed",
      err instanceof Error ? err.message : String(err),
    );
  }
}

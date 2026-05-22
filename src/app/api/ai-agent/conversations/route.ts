import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-response";
import {
  createConversation,
  listConversations,
} from "@/server/repo/ai-agent-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }

  const conversations = await listConversations(80);
  return ok({ conversations });
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    const conversation = await createConversation({
      title: "Chat Baru",
      createdByEmail: admin.email,
    });
    return ok({ conversation });
  } catch {
    return unauthorized();
  }
}

import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-response";
import { listForDashboard } from "@/server/repo/social-account";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }
  const accounts = await listForDashboard();
  return ok({ accounts });
}

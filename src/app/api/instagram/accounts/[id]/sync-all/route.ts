import { requireAdmin } from "@/lib/auth";
import { badRequest, ok, unauthorized } from "@/lib/api-response";
import { syncAll } from "@/server/instagram/sync";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }
  const { id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return badRequest("Invalid account id");
  }
  const result = await syncAll(accountId);
  return ok({ step: "all", ...result });
}

import { getAdminFromRequest } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-response";

export async function GET() {
  const admin = await getAdminFromRequest();
  if (!admin) return unauthorized();
  return ok({ email: admin.email, expiresAt: admin.expiresAt });
}

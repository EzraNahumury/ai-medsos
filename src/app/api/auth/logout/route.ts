import { logoutAdmin } from "@/lib/auth";
import { ok } from "@/lib/api-response";

export async function POST() {
  await logoutAdmin();
  return ok({ loggedOut: true });
}

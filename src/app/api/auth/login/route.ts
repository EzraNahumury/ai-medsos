import { NextRequest } from "next/server";
import { z } from "zod";
import { loginAdmin } from "@/lib/auth";
import { badRequest, ok, unauthorized } from "@/lib/api-response";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid credentials payload", parsed.error.issues);
  }
  const admin = await loginAdmin(parsed.data.email, parsed.data.password);
  if (!admin) return unauthorized("Invalid email or password");
  return ok({ email: admin.email, expiresAt: admin.expiresAt });
}

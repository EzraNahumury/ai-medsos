import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  createSession,
  deleteBySessionToken,
  findBySessionToken,
} from "@/server/repo/admin-session";
import { getEnv } from "./env";

const COOKIE_NAME = "igacc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

export type AdminContext = {
  email: string;
  sessionToken: string;
  expiresAt: Date;
};

function signToken(rawToken: string): string {
  const env = getEnv();
  return createHmac("sha256", env.SESSION_SECRET).update(rawToken).digest("hex");
}

function verifyCredentials(email: string, password: string): boolean {
  const env = getEnv();
  if (email.length !== env.ADMIN_EMAIL.length) return false;
  if (password.length !== env.ADMIN_PASSWORD.length) return false;
  const a = Buffer.from(email);
  const b = Buffer.from(env.ADMIN_EMAIL);
  const c = Buffer.from(password);
  const d = Buffer.from(env.ADMIN_PASSWORD);
  return timingSafeEqual(a, b) && timingSafeEqual(c, d);
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<AdminContext | null> {
  if (!verifyCredentials(email, password)) return null;
  const raw = randomBytes(32).toString("hex");
  const sessionToken = signToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await createSession({ sessionToken, email, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { email, sessionToken, expiresAt };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (raw) {
    const sessionToken = signToken(raw);
    await deleteBySessionToken(sessionToken).catch(() => {});
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminFromRequest(): Promise<AdminContext | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const sessionToken = signToken(raw);
  const session = await findBySessionToken(sessionToken);
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await deleteBySessionToken(sessionToken).catch(() => {});
    return null;
  }
  return {
    email: session.email,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  };
}

export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdminFromRequest();
  if (!admin) {
    throw new AuthError("Admin session required");
  }
  return admin;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

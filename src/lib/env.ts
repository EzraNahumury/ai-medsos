import { z } from "zod";

const truthy = (v: unknown) =>
  typeof v === "string" && ["1", "true", "yes", "on"].includes(v.toLowerCase());

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET must be at least 16 characters"),

  META_APP_ID: z.string().default(""),
  META_APP_SECRET: z.string().default(""),
  META_GRAPH_VERSION: z.string().default("v25.0"),
  META_REDIRECT_URI: z
    .string()
    .url()
    .default("http://localhost:3000/api/instagram/oauth/callback"),
  META_OAUTH_SCOPES: z
    .string()
    .default(
      "instagram_business_basic,instagram_manage_comments,instagram_business_manage_messages",
    ),
  META_WEBHOOK_VERIFY_TOKEN: z.string().default(""),

  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1, "TOKEN_ENCRYPTION_KEY is required"),

  OLLAMA_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("http://localhost:11434"),
  ),
  OLLAMA_HOST: z.preprocess(
    emptyToUndefined,
    z.string().url().default("https://ollama.com"),
  ),
  OLLAMA_KEY: z.string().default(""),
  OLLAMA_API_KEY: z.string().default(""),
  OLLAMA_MODEL: z.string().default("gpt-oss:120b-cloud"),

  DEV_ALLOW_MANUAL_TOKEN_IMPORT: z
    .string()
    .optional()
    .transform((v) => truthy(v)),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(env)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        `Please check .env (see .env.example).`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function isDevTokenImportEnabled(): boolean {
  return getEnv().DEV_ALLOW_MANUAL_TOKEN_IMPORT === true;
}

export function getOllamaHost(): string {
  const env = getEnv();
  return env.OLLAMA_HOST || env.OLLAMA_BASE_URL;
}

export function getOllamaApiKey(): string {
  const env = getEnv();
  return env.OLLAMA_KEY || env.OLLAMA_API_KEY || "";
}

/**
 * Instagram-direct Graph API base URL.
 * Used for all data calls (profile, media, comments, insights).
 */
export function getGraphBaseUrl(): string {
  return "https://graph.instagram.com";
}

/**
 * Instagram OAuth dialog URL — opens the IG login screen.
 */
export function getInstagramOAuthDialogUrl(): string {
  return "https://www.instagram.com/oauth/authorize";
}

/**
 * Endpoint to exchange the OAuth `code` for a short-lived Instagram user token.
 */
export function getInstagramTokenExchangeUrl(): string {
  return "https://api.instagram.com/oauth/access_token";
}

/**
 * Endpoint to exchange a short-lived IG token for a long-lived one (60 days).
 */
export function getInstagramLongLivedTokenUrl(): string {
  return "https://graph.instagram.com/access_token";
}

import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function mask(value: string | undefined | null, keep = 4): string {
  if (!value) return "(not set)";
  if (value.length <= keep) return "•".repeat(value.length);
  return `${"•".repeat(Math.max(value.length - keep, 4))}${value.slice(-keep)}`;
}

function Status({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="badge badge-ok">configured</span>
  ) : (
    <span className="badge badge-err">missing</span>
  );
}

export default function SettingsPage() {
  let env;
  try {
    env = getEnv();
  } catch (e) {
    return (
      <div className="card p-4 border-red-500/40 bg-red-500/10 text-red-300 text-sm whitespace-pre-wrap">
        {e instanceof Error ? e.message : String(e)}
      </div>
    );
  }

  const rows: Array<{ key: string; ok: boolean; value: string }> = [
    {
      key: "DATABASE_URL",
      ok: !!env.DATABASE_URL,
      value: env.DATABASE_URL.replace(/:[^:@/]+@/, ":••••@"),
    },
    { key: "NEXT_PUBLIC_APP_URL", ok: !!env.NEXT_PUBLIC_APP_URL, value: env.NEXT_PUBLIC_APP_URL },
    { key: "ADMIN_EMAIL", ok: !!env.ADMIN_EMAIL, value: env.ADMIN_EMAIL },
    { key: "SESSION_SECRET", ok: !!env.SESSION_SECRET, value: mask(env.SESSION_SECRET) },
    { key: "META_APP_ID", ok: !!env.META_APP_ID, value: env.META_APP_ID || "(not set)" },
    { key: "META_APP_SECRET", ok: !!env.META_APP_SECRET, value: mask(env.META_APP_SECRET) },
    { key: "META_GRAPH_VERSION", ok: !!env.META_GRAPH_VERSION, value: env.META_GRAPH_VERSION },
    { key: "META_REDIRECT_URI", ok: !!env.META_REDIRECT_URI, value: env.META_REDIRECT_URI },
    { key: "META_OAUTH_SCOPES", ok: !!env.META_OAUTH_SCOPES, value: env.META_OAUTH_SCOPES },
    {
      key: "META_WEBHOOK_VERIFY_TOKEN",
      ok: !!env.META_WEBHOOK_VERIFY_TOKEN,
      value: mask(env.META_WEBHOOK_VERIFY_TOKEN),
    },
    {
      key: "TOKEN_ENCRYPTION_KEY",
      ok: !!env.TOKEN_ENCRYPTION_KEY,
      value: mask(env.TOKEN_ENCRYPTION_KEY),
    },
    { key: "OLLAMA_BASE_URL", ok: !!env.OLLAMA_BASE_URL, value: env.OLLAMA_BASE_URL },
    { key: "OLLAMA_HOST", ok: !!env.OLLAMA_HOST, value: env.OLLAMA_HOST },
    { key: "OLLAMA_KEY", ok: !!env.OLLAMA_KEY || !!env.OLLAMA_API_KEY, value: mask(env.OLLAMA_KEY || env.OLLAMA_API_KEY) },
    { key: "OLLAMA_MODEL", ok: !!env.OLLAMA_MODEL, value: env.OLLAMA_MODEL },
    {
      key: "DEV_ALLOW_MANUAL_TOKEN_IMPORT",
      ok: true,
      value: env.DEV_ALLOW_MANUAL_TOKEN_IMPORT ? "true" : "false",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Environment readiness. Secrets are masked.
        </p>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-[color:var(--muted)]">
            <tr className="border-b border-[color:var(--border)]">
              <th className="text-left py-2 pr-4">Key</th>
              <th className="text-left py-2 pr-4">Status</th>
              <th className="text-left py-2 pr-4">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-[color:var(--border)]">
                <td className="py-2 pr-4 font-mono text-xs">{r.key}</td>
                <td className="py-2 pr-4"><Status ok={r.ok} /></td>
                <td className="py-2 pr-4 font-mono text-xs text-[color:var(--muted)]">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4 text-sm text-[color:var(--muted)]">
        <h3 className="font-semibold text-white mb-1">Security notes</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>Tokens are encrypted at rest using AES-256-GCM (TOKEN_ENCRYPTION_KEY).</li>
          <li>Tokens never leave the backend — they are not exposed to the browser.</li>
          <li>The webhook receiver verifies <code>x-hub-signature-256</code> using META_APP_SECRET.</li>
          <li>DEV manual token import must be disabled in production.</li>
        </ul>
      </div>
    </div>
  );
}

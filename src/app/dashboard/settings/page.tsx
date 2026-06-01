import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function mask(value: string | undefined | null, keep = 4): string {
  if (!value) return "(not set)";
  if (value.length <= keep) return "•".repeat(value.length);
  return `${"•".repeat(Math.max(value.length - keep, 4))}${value.slice(-keep)}`;
}

function Status({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="badge badge-ok badge-dot">configured</span>
  ) : (
    <span className="badge badge-err badge-dot">missing</span>
  );
}

type Group = {
  title: string;
  description: string;
  icon: React.ReactNode;
  rows: Array<{ key: string; ok: boolean; value: string }>;
};

export default function SettingsPage() {
  let env;
  try {
    env = getEnv();
  } catch (e) {
    return (
      <div className="space-y-4">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-[color:var(--fg)]">Settings</h1>
        <div className="card p-4 border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 text-[color:var(--danger)] text-sm whitespace-pre-wrap mono">
          {e instanceof Error ? e.message : String(e)}
        </div>
      </div>
    );
  }

  const groups: Group[] = [
    {
      title: "Database",
      description: "Connection to MySQL (XAMPP).",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14a9 3 0 0 0 18 0V5" />
          <path d="M3 12a9 3 0 0 0 18 0" />
        </svg>
      ),
      rows: [
        {
          key: "DATABASE_URL",
          ok: !!env.DATABASE_URL,
          value: env.DATABASE_URL.replace(/:[^:@/]+@/, ":••••@"),
        },
        { key: "NEXT_PUBLIC_APP_URL", ok: !!env.NEXT_PUBLIC_APP_URL, value: env.NEXT_PUBLIC_APP_URL },
      ],
    },
    {
      title: "Authentication",
      description: "Admin login credentials and session.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      rows: [
        { key: "ADMIN_EMAIL", ok: !!env.ADMIN_EMAIL, value: env.ADMIN_EMAIL },
        { key: "SESSION_SECRET", ok: !!env.SESSION_SECRET, value: mask(env.SESSION_SECRET) },
        { key: "TOKEN_ENCRYPTION_KEY", ok: !!env.TOKEN_ENCRYPTION_KEY, value: mask(env.TOKEN_ENCRYPTION_KEY) },
      ],
    },
    {
      title: "Meta / Instagram",
      description: "OAuth and webhook configuration for IG Graph API.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      ),
      rows: [
        { key: "META_APP_ID", ok: !!env.META_APP_ID, value: env.META_APP_ID || "(not set)" },
        { key: "META_APP_SECRET", ok: !!env.META_APP_SECRET, value: mask(env.META_APP_SECRET) },
        { key: "META_GRAPH_VERSION", ok: !!env.META_GRAPH_VERSION, value: env.META_GRAPH_VERSION },
        { key: "META_REDIRECT_URI", ok: !!env.META_REDIRECT_URI, value: env.META_REDIRECT_URI },
        { key: "META_OAUTH_SCOPES", ok: !!env.META_OAUTH_SCOPES, value: env.META_OAUTH_SCOPES },
        { key: "META_WEBHOOK_VERIFY_TOKEN", ok: !!env.META_WEBHOOK_VERIFY_TOKEN, value: mask(env.META_WEBHOOK_VERIFY_TOKEN) },
      ],
    },
    {
      title: "AI / Ollama",
      description: "Ollama Cloud configuration for the AI Agent.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      ),
      rows: [
        { key: "OLLAMA_HOST", ok: !!env.OLLAMA_HOST, value: env.OLLAMA_HOST },
        { key: "OLLAMA_BASE_URL", ok: !!env.OLLAMA_BASE_URL, value: env.OLLAMA_BASE_URL },
        {
          key: "OLLAMA_KEY",
          ok: !!env.OLLAMA_KEY || !!env.OLLAMA_API_KEY,
          value: mask(env.OLLAMA_KEY || env.OLLAMA_API_KEY),
        },
        { key: "OLLAMA_MODEL", ok: !!env.OLLAMA_MODEL, value: env.OLLAMA_MODEL },
      ],
    },
    {
      title: "Development",
      description: "Toggles meant for local development only.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      rows: [
        {
          key: "DEV_ALLOW_MANUAL_TOKEN_IMPORT",
          ok: true,
          value: env.DEV_ALLOW_MANUAL_TOKEN_IMPORT ? "true" : "false",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-[color:var(--fg)]">Settings</h1>
        <p className="text-[color:var(--fg-muted)] mt-1 text-[15px]">
          Environment readiness. All secrets are masked.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((g) => (
          <div key={g.title} className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)] flex items-center justify-center shrink-0">
                {g.icon}
              </div>
              <div>
                <h2 className="font-semibold">{g.title}</h2>
                <p className="text-xs text-muted">{g.description}</p>
              </div>
            </div>
            <div className="space-y-2">
              {g.rows.map((r) => (
                <div
                  key={r.key}
                  className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-elev-2)] p-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <code className="text-xs mono text-fg">{r.key}</code>
                    <Status ok={r.ok} />
                  </div>
                  <div className="mono text-[11px] text-muted break-all">{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-[color:var(--warning)]/15 text-[color:var(--warning)] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.7 2.4 17.4A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3.1L13.7 3.7a2 2 0 0 0-3.4 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold">Security notes</h2>
            <p className="text-xs text-muted">Things you should know.</p>
          </div>
        </div>
        <ul className="text-sm text-soft space-y-1.5 ml-2">
          <li>• Access tokens are encrypted at rest using <span className="kbd">AES-256-GCM</span>.</li>
          <li>• Tokens are <b>never sent to the frontend</b> and <b>never logged</b>.</li>
          <li>• Webhook signatures are verified using <span className="kbd">timingSafeEqual</span> against <span className="kbd">META_APP_SECRET</span>.</li>
          <li>• <span className="kbd">DEV_ALLOW_MANUAL_TOKEN_IMPORT</span> must be <span className="kbd">false</span> in production.</li>
        </ul>
      </div>
    </div>
  );
}

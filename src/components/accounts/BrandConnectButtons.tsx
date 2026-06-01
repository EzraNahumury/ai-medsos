import { VALID_BRANDS } from "@/lib/utils";

const brandDot: Record<string, string> = {
  Ayres: "#ea580c",
  Ava: "#db2777",
  Saifenu: "#0891b2",
};

export default function BrandConnectButtons() {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-[color:var(--fg)]">Connect Instagram</h3>
        <p className="text-[13px] text-[color:var(--fg-muted)] mt-1">
          Authorize a brand to start ingesting data via Meta OAuth.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {VALID_BRANDS.map((b) => (
          <a
            key={b}
            href={`/api/instagram/oauth/start?brand=${encodeURIComponent(b)}`}
            className="group rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev-2)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-elev-3)] transition-colors p-4 flex items-center justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: brandDot[b] }} />
                <span className="font-semibold text-[color:var(--fg)]">{b}</span>
              </div>
              <div className="text-xs text-[color:var(--fg-muted)] mt-1.5">Connect via OAuth</div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4 text-[color:var(--fg-faint)] group-hover:text-[color:var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}

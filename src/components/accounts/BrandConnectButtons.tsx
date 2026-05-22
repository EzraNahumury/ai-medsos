import { VALID_BRANDS } from "@/lib/utils";

const brandStyles: Record<string, string> = {
  Ayres: "from-orange-500 to-amber-500 shadow-orange-500/30",
  Ava: "from-pink-500 to-rose-500 shadow-pink-500/30",
  Saifenu: "from-cyan-500 to-sky-500 shadow-cyan-500/30",
};

export default function BrandConnectButtons() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-title">OAuth</div>
          <h3 className="font-semibold">Connect Instagram</h3>
          <p className="text-xs text-muted mt-1">
            Authorize a brand to start ingesting data via Meta OAuth.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {VALID_BRANDS.map((b) => (
          <a
            key={b}
            href={`/api/instagram/oauth/start?brand=${encodeURIComponent(b)}`}
            className="group relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev-2)] hover:border-[color:var(--border-strong)] transition-all p-5"
          >
            <div
              className={`absolute -right-12 -top-12 w-32 h-32 rounded-full bg-gradient-to-br ${brandStyles[b] ?? ""} opacity-20 group-hover:opacity-30 transition-opacity blur-2xl pointer-events-none`}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <div className={`brand-chip brand-chip-${b.toLowerCase()}`}>{b}</div>
                <div className="text-sm font-medium mt-3">Connect via OAuth</div>
                <div className="text-xs text-muted mt-0.5">Opens Facebook permission dialog</div>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5 text-faint group-hover:text-fg group-hover:translate-x-0.5 transition-all"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

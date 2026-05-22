"use client";

import { useSearchParams } from "next/navigation";

export default function ConnectStatus() {
  const sp = useSearchParams();
  const connected = sp.get("connected");
  if (!connected) return null;
  if (connected === "success") {
    const brand = sp.get("brand");
    const count = sp.get("count");
    return (
      <div className="card p-4 border-[color:var(--success)]/40 bg-[color:var(--success)]/10 flex items-center gap-3 fade-in">
        <div className="w-8 h-8 rounded-full bg-[color:var(--success)]/20 text-[color:var(--success)] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div className="text-sm">
          <div className="font-medium text-[color:var(--success)]">Connection successful</div>
          <div className="text-xs text-soft mt-0.5">
            {count ?? "?"} Instagram account(s) connected for <b>{brand}</b>.
          </div>
        </div>
      </div>
    );
  }
  if (connected === "error") {
    const reason = sp.get("reason");
    return (
      <div className="card p-4 border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 flex items-center gap-3 fade-in">
        <div className="w-8 h-8 rounded-full bg-[color:var(--danger)]/20 text-[color:var(--danger)] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <div className="text-sm">
          <div className="font-medium text-[color:var(--danger)]">OAuth failed</div>
          <div className="text-xs text-soft mt-0.5">
            Reason: <code className="kbd">{reason ?? "unknown"}</code>. Check audit logs for details.
          </div>
        </div>
      </div>
    );
  }
  return null;
}

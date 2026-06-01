"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function initials(email: string): string {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Header({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-[color:var(--border)] flex items-center justify-between px-6 md:px-8 sticky top-0 z-10 backdrop-blur-md bg-[color:var(--bg)]/80">
      <div className="flex items-center gap-2 text-sm text-[color:var(--fg-muted)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[color:var(--fg-faint)]">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <span className="font-medium text-[color:var(--fg-soft)]">Instagram</span>
        <span className="text-[color:var(--fg-faint)]">·</span>
        <span>3 brands</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs text-[color:var(--fg-muted)]">
          <span className="live-dot" />
          <span>Live · 5s polling</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg pl-1 pr-2 py-1 hover:bg-[color:var(--bg-elev-2)] transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-[color:var(--accent)] text-[#15170d] text-[11px] font-semibold flex items-center justify-center">
              {initials(email)}
            </div>
            <div className="hidden md:flex flex-col items-start text-left leading-tight">
              <span className="text-xs font-medium text-[color:var(--fg)]">{email}</span>
              <span className="text-[10px] text-[color:var(--fg-faint)]">Administrator</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-[color:var(--fg-faint)]">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <>
              <div className="fixed inset-0" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 card-elev p-1.5 z-20 fade-in">
                <div className="px-2.5 py-2 border-b border-[color:var(--border-soft)]">
                  <div className="text-xs font-medium text-[color:var(--fg)] truncate">{email}</div>
                  <div className="text-[10px] text-[color:var(--fg-faint)] mt-0.5">Signed in as administrator</div>
                </div>
                <button
                  onClick={onLogout}
                  disabled={busy}
                  className="w-full mt-1 flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-[color:var(--fg-soft)] hover:bg-[color:var(--bg-elev-2)] hover:text-[color:var(--fg)] transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  <span>{busy ? "Signing out…" : "Sign out"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

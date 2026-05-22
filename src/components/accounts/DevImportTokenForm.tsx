"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VALID_BRANDS } from "@/lib/utils";

export default function DevImportTokenForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brandName, setBrandName] = useState<string>(VALID_BRANDS[0]);
  const [igUserId, setIgUserId] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [igAccessToken, setIgAccessToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/instagram/dev/import-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          igUserId,
          igUsername: igUsername || undefined,
          igAccessToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? "Import failed");
        return;
      }
      setResult(
        `Stored account #${data.data.account.id} (${data.data.account.username ?? data.data.account.igUserId}) for ${data.data.account.brandName}.`,
      );
      setIgAccessToken("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-[color:var(--bg-elev-2)] transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-lg bg-[color:var(--warning)]/15 text-[color:var(--warning)] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M9 13l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              DEV: Manual token import
              <span className="badge badge-warn">dev only</span>
            </div>
            <div className="text-xs text-muted mt-0.5">
              Paste a token from Graph API Explorer or the IG API setup screen
            </div>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[color:var(--border)] p-5 fade-in">
          <p className="text-xs text-muted mb-4">
            Only active when <code className="kbd">DEV_ALLOW_MANUAL_TOKEN_IMPORT=&quot;true&quot;</code>.
            Tokens are encrypted at rest via AES-256-GCM. <b>Do not commit tokens.</b>
          </p>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
            <div>
              <label className="label">Brand</label>
              <select
                className="select"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              >
                {VALID_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">IG User ID</label>
              <input
                className="input mono"
                value={igUserId}
                onChange={(e) => setIgUserId(e.target.value)}
                required
                placeholder="17841449559910819"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">IG Username <span className="text-faint">(optional)</span></label>
              <input
                className="input"
                value={igUsername}
                onChange={(e) => setIgUsername(e.target.value)}
                placeholder="ayresapparel"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Instagram Access Token <span className="text-faint">(starts with IGAA…)</span></label>
              <input
                className="input mono"
                value={igAccessToken}
                onChange={(e) => setIgAccessToken(e.target.value)}
                required
                type="password"
                autoComplete="off"
                placeholder="IGAA..."
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 spin">
                      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                    </svg>
                    Importing…
                  </>
                ) : (
                  "Import token"
                )}
              </button>
              {result && (
                <span className="text-xs text-[color:var(--success)] flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {result}
                </span>
              )}
              {error && <span className="text-xs text-[color:var(--danger)]">{error}</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

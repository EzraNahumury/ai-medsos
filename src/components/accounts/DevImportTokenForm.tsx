"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VALID_BRANDS } from "@/lib/utils";

export default function DevImportTokenForm() {
  const router = useRouter();
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
    <details className="card p-4">
      <summary className="cursor-pointer font-semibold">
        DEV: Manual token import (Graph API Explorer)
      </summary>
      <p className="text-xs text-[color:var(--muted)] mt-2">
        Only available when <code>DEV_ALLOW_MANUAL_TOKEN_IMPORT=&quot;true&quot;</code>.
        Tokens are encrypted at rest. Do not commit tokens. This form uses the
        Instagram-direct API (graph.instagram.com).
      </p>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-xs text-[color:var(--muted)]">Brand</span>
          <select
            className="input mt-1"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          >
            {VALID_BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-[color:var(--muted)]">IG User ID</span>
          <input
            className="input mt-1"
            value={igUserId}
            onChange={(e) => setIgUserId(e.target.value)}
            required
            placeholder="17841... or numeric id"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-[color:var(--muted)]">IG Username (optional)</span>
          <input
            className="input mt-1"
            value={igUsername}
            onChange={(e) => setIgUsername(e.target.value)}
            placeholder="ayres"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-[color:var(--muted)]">
            Instagram Access Token (from Graph API Explorer, starts with IGAA...)
          </span>
          <input
            className="input mt-1"
            value={igAccessToken}
            onChange={(e) => setIgAccessToken(e.target.value)}
            required
            type="password"
            autoComplete="off"
          />
        </label>
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Importing…" : "Import token"}
          </button>
          {result && <span className="text-xs text-green-400">{result}</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </form>
    </details>
  );
}

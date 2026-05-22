"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncStep =
  | "sync-profile"
  | "sync-media"
  | "sync-insights"
  | "sync-comments"
  | "sync-all";

const labelOf: Record<SyncStep, string> = {
  "sync-profile": "Profile",
  "sync-media": "Media",
  "sync-insights": "Insights",
  "sync-comments": "Comments",
  "sync-all": "Sync All",
};

export default function AccountActions({
  accountId,
  layout = "row",
}: {
  accountId: number;
  layout?: "row" | "stack";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<SyncStep | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(step: SyncStep) {
    setBusy(step);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/instagram/accounts/${accountId}/${step}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? `${labelOf[step]} failed`);
        return;
      }
      const items =
        typeof data.data?.itemsProcessed === "number"
          ? ` (${data.data.itemsProcessed} items)`
          : "";
      setMessage(`${labelOf[step]} done${items}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const containerClass =
    layout === "stack" ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2";

  return (
    <div className="space-y-2">
      <div className={containerClass}>
        {(["sync-profile", "sync-media", "sync-insights", "sync-comments"] as SyncStep[]).map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            disabled={busy !== null}
            className="btn btn-secondary btn-sm"
          >
            {busy === s ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 spin">
                  <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                </svg>
                Syncing…
              </>
            ) : (
              labelOf[s]
            )}
          </button>
        ))}
        <button
          onClick={() => run("sync-all")}
          disabled={busy !== null}
          className="btn btn-primary btn-sm"
        >
          {busy === "sync-all" ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 spin">
                <path d="M21 12a9 9 0 1 1-6.2-8.55" />
              </svg>
              Syncing all…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
              </svg>
              Sync All
            </>
          )}
        </button>
      </div>
      {message && (
        <p className="text-xs text-[color:var(--success)] flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-[color:var(--danger)] flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

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

export default function AccountActions({ accountId }: { accountId: number }) {
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(
          [
            "sync-profile",
            "sync-media",
            "sync-insights",
            "sync-comments",
          ] as SyncStep[]
        ).map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            disabled={busy !== null}
            className="btn btn-secondary"
          >
            {busy === s ? "Syncing…" : labelOf[s]}
          </button>
        ))}
        <button
          onClick={() => run("sync-all")}
          disabled={busy !== null}
          className="btn btn-primary"
        >
          {busy === "sync-all" ? "Syncing…" : "Sync All"}
        </button>
      </div>
      {message && (
        <p className="text-xs text-green-400">{message}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

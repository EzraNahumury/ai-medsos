"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type RealtimeData = {
  connectedAccounts: Array<{
    id: number;
    brandName: string;
    username: string | null;
    igUserId: string;
    pageId: string | null;
    pageName: string | null;
    tokenStatus: string;
    tokenExpiresAt: string | null;
    followersCount: number | null;
    mediaCount: number | null;
    lastProfileSyncAt: string | null;
    lastMediaSyncAt: string | null;
    lastInsightSyncAt: string | null;
    lastCommentSyncAt: string | null;
  }>;
  latestWebhookEvents: Array<{
    id: number;
    eventId: string | null;
    objectType: string | null;
    fieldName: string | null;
    processingStatus: string;
    errorMessage: string | null;
    receivedAt: string;
    processedAt: string | null;
  }>;
  latestComments: Array<{
    id: number;
    igCommentId: string;
    username: string | null;
    text: string | null;
    timestamp: string | null;
    likeCount: number | null;
    instagramMediaId: number | null;
    socialAccountId: number | null;
    socialAccount: { brandName: string } | null;
  }>;
  latestMedia: Array<{
    id: number;
    igMediaId: string;
    mediaType: string | null;
    caption: string | null;
    permalink: string | null;
    thumbnailUrl: string | null;
    timestamp: string | null;
    likeCount: number | null;
    commentsCount: number | null;
    socialAccount: { brandName: string; username: string | null } | null;
  }>;
  latestMetricSnapshots: Array<{
    id: number;
    instagramMediaId: number;
    reach: number | null;
    impressions: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    views: number | null;
    plays: number | null;
    totalInteractions: number | null;
    engagementRate: number | null;
    collectedAt: string;
  }>;
  latestSyncJobs: Array<{
    id: number;
    jobType: string;
    socialAccountId: number | null;
    status: string;
    errorMessage: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
  }>;
  latestAuditLogs: Array<{
    id: number;
    actor: string;
    action: string;
    entityType: string;
    entityId: string | null;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  counts: {
    connectedAccounts: number;
    totalMedia: number;
    totalComments: number;
    pendingWebhookEvents: number;
  };
  serverTime: string;
};

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleTimeString();
}

function relTime(d: string | null | undefined): string {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OK: "badge badge-ok",
    DONE: "badge badge-ok",
    ACTIVE: "badge badge-ok",
    PROCESSING: "badge badge-info",
    RUNNING: "badge badge-info",
    PENDING: "badge badge-warn",
    WARN: "badge badge-warn",
    UNVERIFIED: "badge badge-warn",
    ERROR: "badge badge-err",
    EXPIRED: "badge badge-err",
  };
  return map[status] ?? "badge badge-info";
}

export default function RealtimeDashboard() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/realtime", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Failed to load realtime data");
        return;
      }
      setError(null);
      setData(json.data as RealtimeData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = window.setInterval(load, 5000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [load]);

  async function onProcess() {
    setProcessing(true);
    setProcessMsg(null);
    try {
      const res = await fetch("/api/webhook/process-pending", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setProcessMsg(json?.error?.message ?? "Process failed");
      } else {
        setProcessMsg(
          `Scanned ${json.data.scanned} · Done ${json.data.done} · Errors ${json.data.errored}`,
        );
        await load();
      }
    } finally {
      setProcessing(false);
    }
  }

  async function onSyncAll(id: number) {
    setSyncing(id);
    try {
      await fetch(`/api/instagram/accounts/${id}/sync-all`, { method: "POST" });
      await load();
    } finally {
      setSyncing(null);
    }
  }

  if (error) {
    return (
      <div className="card p-4 border-red-500/40 bg-red-500/10 text-red-300">
        {error}
      </div>
    );
  }
  if (!data) {
    return <div className="card p-4 text-[color:var(--muted)]">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Realtime</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[color:var(--muted)]">
            polled every 5s · server {fmt(data.serverTime)}
          </span>
          <button onClick={onProcess} className="btn btn-primary" disabled={processing}>
            {processing ? "Processing…" : "Process Webhook Events"}
          </button>
        </div>
      </div>
      {processMsg && <p className="text-xs text-[color:var(--muted)]">{processMsg}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-[color:var(--muted)]">Connected Accounts</div>
          <div className="text-2xl font-semibold">{data.counts.connectedAccounts}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[color:var(--muted)]">Total Media</div>
          <div className="text-2xl font-semibold">{data.counts.totalMedia}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[color:var(--muted)]">Total Comments</div>
          <div className="text-2xl font-semibold">{data.counts.totalComments}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[color:var(--muted)]">Pending Webhook</div>
          <div className="text-2xl font-semibold">{data.counts.pendingWebhookEvents}</div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Connected IG Accounts</h2>
        {data.connectedAccounts.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No accounts connected.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-[color:var(--muted)]">
                <tr className="border-b border-[color:var(--border)]">
                  <th className="text-left py-2 pr-4">Brand</th>
                  <th className="text-left py-2 pr-4">User</th>
                  <th className="text-left py-2 pr-4">Token</th>
                  <th className="text-left py-2 pr-4">Profile</th>
                  <th className="text-left py-2 pr-4">Media</th>
                  <th className="text-left py-2 pr-4">Insights</th>
                  <th className="text-left py-2 pr-4">Comments</th>
                  <th className="text-left py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.connectedAccounts.map((a) => (
                  <tr key={a.id} className="border-b border-[color:var(--border)]">
                    <td className="py-2 pr-4">
                      <Link href={`/dashboard/accounts/${a.id}`} className="hover:underline">
                        {a.brandName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{a.username ? `@${a.username}` : a.igUserId}</td>
                    <td className="py-2 pr-4"><span className={statusBadge(a.tokenStatus)}>{a.tokenStatus}</span></td>
                    <td className="py-2 pr-4 text-xs">{relTime(a.lastProfileSyncAt)}</td>
                    <td className="py-2 pr-4 text-xs">{relTime(a.lastMediaSyncAt)}</td>
                    <td className="py-2 pr-4 text-xs">{relTime(a.lastInsightSyncAt)}</td>
                    <td className="py-2 pr-4 text-xs">{relTime(a.lastCommentSyncAt)}</td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => onSyncAll(a.id)}
                        className="btn btn-secondary"
                        disabled={syncing !== null}
                      >
                        {syncing === a.id ? "Syncing…" : "Sync All"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Latest Webhook Events</h2>
          {data.latestWebhookEvents.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">None.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.latestWebhookEvents.map((e) => (
                <li key={e.id} className="border-b border-[color:var(--border)] pb-2">
                  <div className="flex justify-between text-xs">
                    <div className="flex gap-2 items-center">
                      <span className={statusBadge(e.processingStatus)}>{e.processingStatus}</span>
                      <span className="text-[color:var(--muted)]">
                        {e.objectType ?? "?"} · {e.fieldName ?? "?"}
                      </span>
                    </div>
                    <span className="text-[color:var(--muted)]">{relTime(e.receivedAt)}</span>
                  </div>
                  {e.errorMessage && (
                    <div className="text-xs text-red-400 mt-1">{e.errorMessage}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Latest Sync Jobs</h2>
          {data.latestSyncJobs.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">None.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.latestSyncJobs.map((j) => (
                <li key={j.id} className="border-b border-[color:var(--border)] pb-2">
                  <div className="flex justify-between text-xs">
                    <div className="flex gap-2 items-center">
                      <span className={statusBadge(j.status)}>{j.status}</span>
                      <span className="text-[color:var(--muted)]">{j.jobType}</span>
                      {j.socialAccountId && (
                        <span className="text-[color:var(--muted)]">acct #{j.socialAccountId}</span>
                      )}
                    </div>
                    <span className="text-[color:var(--muted)]">{relTime(j.createdAt)}</span>
                  </div>
                  {j.errorMessage && (
                    <div className="text-xs text-red-400 mt-1">{j.errorMessage}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Latest Comments</h2>
          {data.latestComments.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">None.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.latestComments.map((c) => (
                <li key={c.id} className="border-b border-[color:var(--border)] pb-2">
                  <div className="flex justify-between text-xs text-[color:var(--muted)]">
                    <span>
                      [{c.socialAccount?.brandName ?? "?"}] @{c.username ?? "anon"}
                    </span>
                    <span>{relTime(c.timestamp)}</span>
                  </div>
                  <div className="text-sm">{c.text ?? "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Latest Media</h2>
          {data.latestMedia.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">None.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.latestMedia.map((m) => (
                <li key={m.id} className="border-b border-[color:var(--border)] pb-2">
                  <div className="flex justify-between text-xs text-[color:var(--muted)]">
                    <span>
                      [{m.socialAccount?.brandName ?? "?"}] {m.mediaType ?? "?"} ·{" "}
                      @{m.socialAccount?.username ?? "?"}
                    </span>
                    <span>{relTime(m.timestamp)}</span>
                  </div>
                  <a
                    href={m.permalink ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {m.caption?.slice(0, 100) ?? "(no caption)"}
                  </a>
                  <div className="text-xs text-[color:var(--muted)]">
                    ❤ {m.likeCount ?? "—"} · 💬 {m.commentsCount ?? "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Latest Metric Snapshots</h2>
        {data.latestMetricSnapshots.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No snapshots yet.</p>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead className="text-xs text-[color:var(--muted)]">
                <tr className="border-b border-[color:var(--border)]">
                  <th className="text-left py-2 pr-4">When</th>
                  <th className="text-left py-2 pr-4">Media</th>
                  <th className="text-right py-2 pr-4">Reach</th>
                  <th className="text-right py-2 pr-4">Imp</th>
                  <th className="text-right py-2 pr-4">Likes</th>
                  <th className="text-right py-2 pr-4">Comm</th>
                  <th className="text-right py-2 pr-4">Shares</th>
                  <th className="text-right py-2 pr-4">Saves</th>
                  <th className="text-right py-2 pr-4">Views</th>
                  <th className="text-right py-2 pr-4">ER%</th>
                </tr>
              </thead>
              <tbody>
                {data.latestMetricSnapshots.map((s) => (
                  <tr key={s.id} className="border-b border-[color:var(--border)]">
                    <td className="py-2 pr-4 text-xs">{relTime(s.collectedAt)}</td>
                    <td className="py-2 pr-4 text-xs">#{s.instagramMediaId}</td>
                    <td className="py-2 pr-4 text-right">{s.reach ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">{s.impressions ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">{s.likes ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">{s.comments ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">{s.shares ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">{s.saves ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">{s.views ?? s.plays ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">
                      {s.engagementRate !== null ? s.engagementRate.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Latest Audit Logs</h2>
        {data.latestAuditLogs.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">None.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {data.latestAuditLogs.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <div className="flex gap-2 items-center">
                  <span className={statusBadge(l.status)}>{l.status}</span>
                  <span className="text-[color:var(--muted)]">{l.actor}</span>
                  <span>{l.action}</span>
                  <span className="text-[color:var(--muted)]">
                    {l.entityType}{l.entityId ? `#${l.entityId}` : ""}
                  </span>
                  {l.message && <span className="text-[color:var(--muted)]">— {l.message}</span>}
                </div>
                <span className="text-[color:var(--muted)] shrink-0">{relTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

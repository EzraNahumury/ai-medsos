"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

const TH = "text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]";
const THR = "text-right px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]";
const TD = "px-4 py-3 whitespace-nowrap";
const TDR = "px-4 py-3 whitespace-nowrap text-right";
const TRow = "border-t border-[color:var(--border-soft)] hover:bg-[color:var(--bg-elev-2)] transition-colors";

const IconAcct = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20c1.2-4 4.2-6 8-6s6.8 2 8 6" />
  </svg>
);
const IconWebhook = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
    <circle cx="6" cy="18" r="3" />
    <path d="M9.5 16 14 8" />
    <circle cx="16" cy="6" r="3" />
    <path d="M18 8.5 13 17" />
    <circle cx="18" cy="18" r="3" />
    <path d="M15 18H8" />
  </svg>
);
const IconJobs = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
const IconChat = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
    <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.6A8.5 8.5 0 1 1 21 12z" />
  </svg>
);
const IconMedia = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);
const IconChart = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 4 4 6-6" />
  </svg>
);
const IconAudit = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

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

function fmtTime(d: string | null | undefined): string {
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
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function brandChipClass(brand: string | null | undefined): string {
  switch (brand) {
    case "Ayres": return "brand-chip brand-chip-ayres";
    case "Ava": return "brand-chip brand-chip-ava";
    case "Saifenu": return "brand-chip brand-chip-saifenu";
    default: return "brand-chip";
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OK: "badge badge-ok badge-dot",
    DONE: "badge badge-ok badge-dot",
    ACTIVE: "badge badge-ok badge-dot",
    PROCESSING: "badge badge-info badge-dot",
    RUNNING: "badge badge-info badge-dot",
    PENDING: "badge badge-warn badge-dot",
    WARN: "badge badge-warn badge-dot",
    UNVERIFIED: "badge badge-warn badge-dot",
    ERROR: "badge badge-err badge-dot",
    EXPIRED: "badge badge-err badge-dot",
  };
  return map[status] ?? "badge badge-info";
}

export default function RealtimeDashboard() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);

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
    const initial = window.setTimeout(() => { void load(); }, 0);
    const interval = window.setInterval(() => { void load(); }, 5000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
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
      <div className="card p-4 border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 text-[color:var(--danger)]">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 spin">
            <path d="M21 12a9 9 0 1 1-6.2-8.55" />
          </svg>
          Loading realtime data…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="live-dot" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--success)]">Live</span>
          </div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-[color:var(--fg)]">Realtime monitor</h1>
          <p className="text-[color:var(--fg-muted)] mt-1 text-[15px]">
            Auto-refreshing every 5 seconds · Server time {fmtTime(data.serverTime)}
          </p>
        </div>
        <button onClick={onProcess} className="btn btn-primary" disabled={processing}>
          {processing ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 spin">
                <path d="M21 12a9 9 0 1 1-6.2-8.55" />
              </svg>
              Processing…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="m13 2-3 14h7l-3 6 9-11h-7l3-9z" fill="currentColor" />
              </svg>
              Process webhook events
            </>
          )}
        </button>
      </div>
      {processMsg && (
        <div className="card p-3 text-xs text-soft fade-in">{processMsg}</div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Counter label="Accounts" value={data.counts.connectedAccounts} />
        <Counter label="Media" value={data.counts.totalMedia} />
        <Counter label="Comments" value={data.counts.totalComments} />
        <Counter
          label="Pending events"
          value={data.counts.pendingWebhookEvents}
          tone={data.counts.pendingWebhookEvents > 0 ? "warning" : "default"}
        />
      </div>

      {/* Connected accounts table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">Accounts</div>
            <h2 className="font-semibold">Connected & sync status</h2>
          </div>
        </div>
        {data.connectedAccounts.length === 0 ? (
          <EmptyState icon={IconAcct} title="No accounts connected" />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <div className="min-w-full px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[color:var(--bg-elev-2)]">
                    <th className={TH}>Brand</th>
                    <th className={TH}>User</th>
                    <th className={TH}>Token</th>
                    <th className={TH}>Profile</th>
                    <th className={TH}>Media</th>
                    <th className={TH}>Insights</th>
                    <th className={TH}>Comments</th>
                    <th className={THR}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.connectedAccounts.map((a) => (
                    <tr key={a.id} className={TRow}>
                      <td className={TD}>
                        <Link href={`/dashboard/accounts/${a.id}`} className="hover:opacity-80">
                          <span className={brandChipClass(a.brandName)}>{a.brandName}</span>
                        </Link>
                      </td>
                      <td className={`${TD} text-[color:var(--fg-soft)]`}>
                        {a.username ? `@${a.username}` : <span className="mono text-xs">{a.igUserId}</span>}
                      </td>
                      <td className={TD}><span className={statusBadge(a.tokenStatus)}>{a.tokenStatus}</span></td>
                      <td className={`${TD} text-[color:var(--fg-muted)] text-xs`}>{relTime(a.lastProfileSyncAt)}</td>
                      <td className={`${TD} text-[color:var(--fg-muted)] text-xs`}>{relTime(a.lastMediaSyncAt)}</td>
                      <td className={`${TD} text-[color:var(--fg-muted)] text-xs`}>{relTime(a.lastInsightSyncAt)}</td>
                      <td className={`${TD} text-[color:var(--fg-muted)] text-xs`}>{relTime(a.lastCommentSyncAt)}</td>
                      <td className={TDR}>
                        <button
                          onClick={() => onSyncAll(a.id)}
                          className="btn btn-secondary btn-sm"
                          disabled={syncing !== null}
                        >
                          {syncing === a.id ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 spin">
                                <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                              </svg>
                              Syncing
                            </>
                          ) : (
                            "Sync All"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Activity columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Webhook</div>
              <h2 className="font-semibold">Latest events</h2>
            </div>
          </div>
          {data.latestWebhookEvents.length === 0 ? (
            <EmptyState icon={IconWebhook} title="No events received" />
          ) : (
            <ul className="space-y-2">
              {data.latestWebhookEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-2 py-2 border-b border-[color:var(--border-soft)] last:border-0">
                  <span className={statusBadge(e.processingStatus)}>{e.processingStatus}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{e.fieldName ?? "?"}</div>
                    <div className="text-[10px] text-faint">{e.objectType ?? "—"}</div>
                    {e.errorMessage && (
                      <div className="text-[10px] text-[color:var(--danger)] mt-1">{e.errorMessage}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-faint shrink-0">{relTime(e.receivedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Jobs</div>
              <h2 className="font-semibold">Latest sync jobs</h2>
            </div>
          </div>
          {data.latestSyncJobs.length === 0 ? (
            <EmptyState icon={IconJobs} title="No jobs yet" />
          ) : (
            <ul className="space-y-2">
              {data.latestSyncJobs.map((j) => (
                <li key={j.id} className="flex items-start gap-2 py-2 border-b border-[color:var(--border-soft)] last:border-0">
                  <span className={statusBadge(j.status)}>{j.status}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium mono">{j.jobType}</div>
                    {j.socialAccountId && (
                      <div className="text-[10px] text-faint">acct #{j.socialAccountId}</div>
                    )}
                    {j.errorMessage && (
                      <div className="text-[10px] text-[color:var(--danger)] mt-1">{j.errorMessage}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-faint shrink-0">{relTime(j.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Activity columns 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Comments</div>
              <h2 className="font-semibold">Latest comments</h2>
            </div>
            <Link href="/dashboard/comments" className="text-xs text-soft hover:text-fg">All →</Link>
          </div>
          {data.latestComments.length === 0 ? (
            <EmptyState icon={IconChat} title="No comments yet" />
          ) : (
            <ul className="space-y-3">
              {data.latestComments.map((c) => (
                <li key={c.id} className="flex gap-2.5 pb-3 border-b border-[color:var(--border-soft)] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[color:var(--bg-elev-3)] flex items-center justify-center text-[10px] font-medium shrink-0">
                    {c.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {c.socialAccount?.brandName && (
                        <span className={brandChipClass(c.socialAccount.brandName)}>{c.socialAccount.brandName}</span>
                      )}
                      <span className="font-medium">@{c.username ?? "anon"}</span>
                      <span className="text-[10px] text-faint">{relTime(c.timestamp)}</span>
                    </div>
                    <div className="text-xs text-soft mt-0.5 line-clamp-2">{c.text ?? "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Media</div>
              <h2 className="font-semibold">Latest posts</h2>
            </div>
            <Link href="/dashboard/content" className="text-xs text-soft hover:text-fg">All →</Link>
          </div>
          {data.latestMedia.length === 0 ? (
            <EmptyState icon={IconMedia} title="No media yet" />
          ) : (
            <ul className="space-y-3">
              {data.latestMedia.map((m) => (
                <li key={m.id} className="flex gap-3 pb-3 border-b border-[color:var(--border-soft)] last:border-0">
                  <div className="w-12 h-12 rounded-md bg-[color:var(--bg-elev-3)] shrink-0 overflow-hidden flex items-center justify-center">
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-faint text-[10px]">{m.mediaType?.slice(0, 1) ?? "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {m.socialAccount?.brandName && (
                        <span className={brandChipClass(m.socialAccount.brandName)}>{m.socialAccount.brandName}</span>
                      )}
                      <span className="text-[10px] text-faint uppercase tracking-wider">{m.mediaType}</span>
                    </div>
                    <a
                      href={m.permalink ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-soft hover:text-fg mt-0.5 line-clamp-2"
                    >
                      {m.caption?.slice(0, 100) ?? "(no caption)"}
                    </a>
                    <div className="text-[10px] text-[color:var(--fg-faint)] mt-1 tnum flex items-center gap-2">
                      <span>{(m.likeCount ?? 0).toLocaleString()} likes</span>
                      <span>·</span>
                      <span>{(m.commentsCount ?? 0).toLocaleString()} comm</span>
                      <span>·</span>
                      <span>{relTime(m.timestamp)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Metrics table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">Insights</div>
            <h2 className="font-semibold">Latest metric snapshots</h2>
          </div>
        </div>
        {data.latestMetricSnapshots.length === 0 ? (
          <EmptyState icon={IconChart} title="No snapshots" />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <div className="min-w-full px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[color:var(--bg-elev-2)]">
                    <th className={TH}>When</th>
                    <th className={TH}>Media</th>
                    <th className={THR}>Reach</th>
                    <th className={THR}>Imp</th>
                    <th className={THR}>Likes</th>
                    <th className={THR}>Comm</th>
                    <th className={THR}>Shares</th>
                    <th className={THR}>Saves</th>
                    <th className={THR}>Views</th>
                    <th className={THR}>ER%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latestMetricSnapshots.map((s) => (
                    <tr key={s.id} className={TRow}>
                      <td className={`${TD} text-[color:var(--fg-muted)] text-xs`}>{relTime(s.collectedAt)}</td>
                      <td className={`${TD} mono text-xs text-[color:var(--fg-soft)]`}>#{s.instagramMediaId}</td>
                      <td className={`${TDR} tnum text-[color:var(--fg)]`}>{s.reach?.toLocaleString() ?? "—"}</td>
                      <td className={`${TDR} tnum text-[color:var(--fg)]`}>{s.impressions?.toLocaleString() ?? "—"}</td>
                      <td className={`${TDR} tnum text-[color:var(--fg)]`}>{s.likes?.toLocaleString() ?? "—"}</td>
                      <td className={`${TDR} tnum text-[color:var(--fg)]`}>{s.comments?.toLocaleString() ?? "—"}</td>
                      <td className={`${TDR} tnum text-[color:var(--fg)]`}>{s.shares?.toLocaleString() ?? "—"}</td>
                      <td className={`${TDR} tnum text-[color:var(--fg)]`}>{s.saves?.toLocaleString() ?? "—"}</td>
                      <td className={`${TDR} tnum text-[color:var(--fg)]`}>{(s.views ?? s.plays)?.toLocaleString() ?? "—"}</td>
                      <td className={`${TDR} tnum text-[color:var(--accent)] font-medium`}>
                        {s.engagementRate != null ? s.engagementRate.toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Audit log */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">Trail</div>
            <h2 className="font-semibold">Audit log</h2>
          </div>
        </div>
        {data.latestAuditLogs.length === 0 ? (
          <EmptyState icon={IconAudit} title="No activity" />
        ) : (
          <ul className="divide-y divide-[color:var(--border-soft)] -mx-2">
            {data.latestAuditLogs.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 px-2 py-2.5 text-xs hover:bg-[color:var(--bg-elev-2)] rounded transition-colors"
              >
                <span className={`${statusBadge(l.status)} shrink-0`}>{l.status}</span>
                <span className="mono text-[color:var(--fg-soft)] shrink-0">{l.actor}</span>
                <span className="text-[color:var(--fg)] shrink-0 font-medium">{l.action}</span>
                <span className="text-[color:var(--fg-faint)] text-[10px] mono shrink-0">
                  {l.entityType}{l.entityId ? `#${l.entityId}` : ""}
                </span>
                {l.message && (
                  <span className="text-[color:var(--fg-muted)] truncate flex-1">— {l.message}</span>
                )}
                <span className="text-[color:var(--fg-faint)] text-[10px] shrink-0 ml-auto whitespace-nowrap">{relTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  const accent = tone === "warning" && value > 0 ? "text-[color:var(--warning)]" : "text-[color:var(--fg)]";
  return (
    <div className="card p-4">
      <div className="text-[11px] text-[color:var(--fg-faint)] uppercase tracking-wide">{label}</div>
      <div className={`text-[1.75rem] font-semibold tnum mt-1 ${accent}`}>{value.toLocaleString()}</div>
    </div>
  );
}

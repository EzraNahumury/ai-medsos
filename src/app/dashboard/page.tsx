import Link from "next/link";
import { count as commentCount } from "@/server/repo/instagram-comment";
import {
  count as mediaCount,
  listRecentByCreatedAt,
} from "@/server/repo/instagram-media";
import { listRecent as listRecentMetrics } from "@/server/repo/media-metric";
import { count as accountCount, listForDashboard } from "@/server/repo/social-account";
import { countPending, listRecent as listRecentEvents } from "@/server/repo/webhook-event";
import { formatDateTime, relativeTime, truncate } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

function brandChipClass(brand: string): string {
  switch (brand) {
    case "Ayres": return "brand-chip brand-chip-ayres";
    case "Ava": return "brand-chip brand-chip-ava";
    case "Saifenu": return "brand-chip brand-chip-saifenu";
    default: return "brand-chip";
  }
}

const StatIcon = {
  Accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c1.2-4 4.2-6 8-6s6.8 2 8 6" />
    </svg>
  ),
  Media: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  Comments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.6A8.5 8.5 0 1 1 21 12z" />
    </svg>
  ),
  Webhook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="6" cy="18" r="3" />
      <path d="M9.5 16 14 8" />
      <circle cx="16" cy="6" r="3" />
      <path d="M18 8.5 13 17" />
      <circle cx="18" cy="18" r="3" />
      <path d="M15 18H8" />
    </svg>
  ),
};

export default async function DashboardOverviewPage() {
  const [
    accountCountValue,
    mediaCountValue,
    commentCountValue,
    pendingWebhooks,
    latestEvents,
    latestSnapshots,
    accounts,
    recentMedia,
  ] = await Promise.all([
    accountCount(),
    mediaCount(),
    commentCount(),
    countPending(),
    listRecentEvents(5),
    listRecentMetrics(5),
    listForDashboard(),
    listRecentByCreatedAt(4),
  ]);

  const cards = [
    { label: "Connected accounts", value: accountCountValue, href: "/dashboard/accounts", icon: StatIcon.Accounts },
    { label: "Total media", value: mediaCountValue, href: "/dashboard/content", icon: StatIcon.Media },
    { label: "Total comments", value: commentCountValue, href: "/dashboard/comments", icon: StatIcon.Comments },
    { label: "Pending webhooks", value: pendingWebhooks, href: "/dashboard/realtime", icon: StatIcon.Webhook },
  ];

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-[color:var(--fg)]">Overview</h1>
          <p className="text-[color:var(--fg-muted)] mt-1 text-[15px]">
            Data ingestion snapshot across your connected Instagram brands.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/accounts" className="btn btn-secondary">
            Manage accounts
          </Link>
          <Link href="/dashboard/realtime" className="btn btn-primary">
            <span className="live-dot" style={{ background: "#15170d", boxShadow: "0 0 0 3px rgba(21,23,13,0.2)" }} />
            Open realtime
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card card-hover p-5 group">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)] flex items-center justify-center">
                {c.icon}
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4 text-[color:var(--fg-faint)] opacity-0 group-hover:opacity-100 transition-opacity">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </div>
            <div className="text-[1.9rem] font-semibold tracking-tight tnum mt-4 text-[color:var(--fg)]">
              {c.value.toLocaleString()}
            </div>
            <div className="text-[13px] text-[color:var(--fg-muted)] mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Brands summary */}
      {accounts.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[color:var(--fg)]">Connected brands</h2>
            <Link href="/dashboard/accounts" className="text-xs font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/accounts/${a.id}`}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev-2)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-elev-3)] transition-colors p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-[color:var(--bg-elev-3)] border border-[color:var(--border)] flex items-center justify-center text-sm font-semibold text-[color:var(--fg-soft)] shrink-0">
                  {(a.username?.[0] ?? a.brandName[0]).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={brandChipClass(a.brandName)}>{a.brandName}</span>
                    <span className={a.tokenStatus === "ACTIVE" ? "badge badge-ok badge-dot" : "badge badge-warn badge-dot"}>
                      {a.tokenStatus}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--fg-muted)] mt-1.5 truncate">
                    @{a.username ?? a.igUserId}
                  </div>
                  <div className="text-[11px] text-[color:var(--fg-faint)] mt-0.5 tnum">
                    {a.followersCount?.toLocaleString() ?? "—"} followers · {a.mediaCount ?? "—"} posts
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latest media (span 2) */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[color:var(--fg)]">Latest media</h2>
            <Link href="/dashboard/content" className="text-xs font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]">
              View all →
            </Link>
          </div>
          {recentMedia.length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="9" cy="9" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              }
              title="No media yet"
              description="Run a sync to pull posts from connected accounts."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentMedia.map((m) => (
                <a
                  key={m.id}
                  href={m.permalink ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev-2)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-elev-3)] transition-colors p-3 flex gap-3"
                >
                  <div className="w-16 h-16 rounded-lg bg-[color:var(--bg-elev-3)] shrink-0 overflow-hidden flex items-center justify-center">
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[color:var(--fg-faint)] text-[10px] uppercase">{m.mediaType?.slice(0, 4) ?? "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {m.socialAccountBrandName && (
                        <span className={brandChipClass(m.socialAccountBrandName)}>
                          {m.socialAccountBrandName}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-[color:var(--fg-soft)] line-clamp-2">{truncate(m.caption, 70) || "—"}</div>
                    <div className="text-[11px] text-[color:var(--fg-faint)] mt-1.5 tnum">
                      {(m.likeCount ?? 0).toLocaleString()} likes · {(m.commentsCount ?? 0).toLocaleString()} comments · {relativeTime(m.timestamp)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Latest webhook events */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[color:var(--fg)]">Webhook activity</h2>
            <Link href="/dashboard/realtime" className="text-xs font-medium text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]">
              View all →
            </Link>
          </div>
          {latestEvents.length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                  <circle cx="6" cy="18" r="3" />
                  <path d="M9.5 16 14 8" />
                  <circle cx="16" cy="6" r="3" />
                  <path d="M18 8.5 13 17" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M15 18H8" />
                </svg>
              }
              title="No events"
              description="Set up webhooks to receive realtime events."
            />
          ) : (
            <ul className="space-y-1">
              {latestEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 py-2.5 border-b border-[color:var(--border-soft)] last:border-0">
                  <span
                    className={
                      e.processingStatus === "DONE"
                        ? "badge badge-ok badge-dot"
                        : e.processingStatus === "ERROR"
                        ? "badge badge-err badge-dot"
                        : "badge badge-warn badge-dot"
                    }
                  >
                    {e.processingStatus}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[color:var(--fg)]">{e.fieldName ?? "?"}</div>
                    <div className="text-[11px] text-[color:var(--fg-faint)] mt-0.5">
                      {e.objectType ?? "—"} · {relativeTime(e.receivedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Latest metrics */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="font-semibold text-[color:var(--fg)]">Latest metric snapshots</h2>
        </div>
        {latestSnapshots.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 6-6" />
              </svg>
            }
            title="No snapshots yet"
            description="Run Sync Insights on a connected account."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[color:var(--bg-elev-2)] border-y border-[color:var(--border)] text-[11px] font-medium uppercase tracking-wide text-[color:var(--fg-muted)]">
                  <th className="text-left px-5 py-2.5">Media</th>
                  <th className="text-right px-5 py-2.5">Reach</th>
                  <th className="text-right px-5 py-2.5">Likes</th>
                  <th className="text-right px-5 py-2.5">Comments</th>
                  <th className="text-right px-5 py-2.5">Engagement</th>
                  <th className="text-right px-5 py-2.5">Collected</th>
                </tr>
              </thead>
              <tbody>
                {latestSnapshots.map((s) => (
                  <tr key={s.id} className="border-b border-[color:var(--border-soft)] last:border-0 hover:bg-[color:var(--bg-elev-2)] transition-colors">
                    <td className="px-5 py-3 mono text-xs text-[color:var(--fg-soft)] whitespace-nowrap">#{s.instagramMediaId}</td>
                    <td className="px-5 py-3 tnum text-right whitespace-nowrap text-[color:var(--fg)]">{s.reach?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-3 tnum text-right whitespace-nowrap text-[color:var(--fg)]">{s.likes?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-3 tnum text-right whitespace-nowrap text-[color:var(--fg)]">{s.comments?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-3 tnum text-right whitespace-nowrap font-medium text-[color:var(--accent)]">
                      {s.engagementRate != null ? `${s.engagementRate.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[color:var(--fg-muted)] whitespace-nowrap">{formatDateTime(s.collectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

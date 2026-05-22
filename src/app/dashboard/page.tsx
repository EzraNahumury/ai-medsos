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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c1.2-4 4.2-6 8-6s6.8 2 8 6" />
    </svg>
  ),
  Media: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  Comments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.6A8.5 8.5 0 1 1 21 12z" />
    </svg>
  ),
  Webhook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
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
    {
      label: "Connected Accounts",
      value: accountCountValue,
      href: "/dashboard/accounts",
      icon: StatIcon.Accounts,
      tone: "from-indigo-500/20 to-indigo-500/0 text-indigo-300",
    },
    {
      label: "Total Media",
      value: mediaCountValue,
      href: "/dashboard/content",
      icon: StatIcon.Media,
      tone: "from-violet-500/20 to-violet-500/0 text-violet-300",
    },
    {
      label: "Total Comments",
      value: commentCountValue,
      href: "/dashboard/comments",
      icon: StatIcon.Comments,
      tone: "from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300",
    },
    {
      label: "Pending Webhooks",
      value: pendingWebhooks,
      href: "/dashboard/realtime",
      icon: StatIcon.Webhook,
      tone: "from-amber-500/20 to-amber-500/0 text-amber-300",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-soft mt-1.5">
            Real-time data ingestion snapshot across all connected Instagram brands.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/accounts" className="btn btn-secondary">
            Manage accounts
          </Link>
          <Link href="/dashboard/realtime" className="btn btn-primary">
            <span className="live-dot" /> Open Realtime
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card card-hover p-5 group relative overflow-hidden"
          >
            <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${c.tone} blur-2xl opacity-60 pointer-events-none`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <span className="text-faint">{c.icon}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-faint opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </div>
              <div className="text-3xl font-semibold tracking-tight">{c.value.toLocaleString()}</div>
              <div className="text-xs text-muted mt-1.5">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Brands summary */}
      {accounts.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Brand status</div>
              <h2 className="font-semibold">Connected brands</h2>
            </div>
            <Link href="/dashboard/accounts" className="text-xs text-soft hover:text-fg">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/accounts/${a.id}`}
                className="card card-hover bg-[color:var(--bg-elev-2)] p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {a.brandName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={brandChipClass(a.brandName)}>{a.brandName}</span>
                    <span className={a.tokenStatus === "ACTIVE" ? "badge badge-ok badge-dot" : "badge badge-warn badge-dot"}>
                      {a.tokenStatus}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-1 truncate">
                    @{a.username ?? a.igUserId}
                  </div>
                  <div className="text-[10px] text-faint mt-0.5">
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
            <div>
              <div className="section-title">Recent</div>
              <h2 className="font-semibold">Latest media</h2>
            </div>
            <Link href="/dashboard/content" className="text-xs text-soft hover:text-fg">
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
                  className="card card-hover bg-[color:var(--bg-elev-2)] p-3 flex gap-3"
                >
                  <div className="w-16 h-16 rounded-md bg-[color:var(--bg-elev-3)] shrink-0 overflow-hidden flex items-center justify-center">
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-faint text-xs">{m.mediaType?.slice(0, 1) ?? "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {m.socialAccountBrandName && (
                        <span className={brandChipClass(m.socialAccountBrandName)}>
                          {m.socialAccountBrandName}
                        </span>
                      )}
                      <span className="text-[10px] text-faint uppercase tracking-wider">{m.mediaType}</span>
                    </div>
                    <div className="text-xs text-soft line-clamp-2">{truncate(m.caption, 80) || "—"}</div>
                    <div className="flex items-center gap-3 text-[10px] text-faint mt-1.5 mono">
                      <span>♥ {m.likeCount ?? 0}</span>
                      <span>💬 {m.commentsCount ?? 0}</span>
                      <span>{relativeTime(m.timestamp)}</span>
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
            <div>
              <div className="section-title">Events</div>
              <h2 className="font-semibold">Webhook activity</h2>
            </div>
            <Link href="/dashboard/realtime" className="text-xs text-soft hover:text-fg">
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
            <ul className="space-y-2">
              {latestEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 py-2 border-b border-[color:var(--border-soft)] last:border-0">
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
                    <div className="text-xs font-medium">{e.fieldName ?? "?"}</div>
                    <div className="text-[10px] text-faint mt-0.5">
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
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">Insights</div>
            <h2 className="font-semibold">Latest metric snapshots</h2>
          </div>
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
          <div className="overflow-x-auto -mx-5">
            <div className="min-w-full px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[color:var(--bg-elev-2)]">
                    <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]">Media</th>
                    <th className="text-right px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]">Reach</th>
                    <th className="text-right px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]">Likes</th>
                    <th className="text-right px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]">Comments</th>
                    <th className="text-right px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]">Engagement</th>
                    <th className="text-right px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-[color:var(--fg-muted)]">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSnapshots.map((s) => (
                    <tr key={s.id} className="border-t border-[color:var(--border-soft)] hover:bg-[color:var(--bg-elev-2)] transition-colors">
                      <td className="px-4 py-3 mono text-xs text-[color:var(--fg-soft)] whitespace-nowrap">#{s.instagramMediaId}</td>
                      <td className="px-4 py-3 mono text-right whitespace-nowrap">{s.reach?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 mono text-right whitespace-nowrap">{s.likes?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 mono text-right whitespace-nowrap">{s.comments?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 mono text-right whitespace-nowrap text-[color:var(--accent)] font-medium">
                        {s.engagementRate != null ? `${s.engagementRate.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[color:var(--fg-muted)] whitespace-nowrap">{formatDateTime(s.collectedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

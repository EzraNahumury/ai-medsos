import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime, relativeTime, truncate } from "@/lib/utils";
import AccountActions from "@/components/accounts/AccountActions";
import { findById } from "@/server/repo/social-account";
import { listBySocialAccount as listMediaForAccount } from "@/server/repo/instagram-media";
import { listBySocialAccount as listCommentsForAccount } from "@/server/repo/instagram-comment";
import { listForSocialAccount as listMetricsForAccount } from "@/server/repo/media-metric";
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

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId)) notFound();

  const account = await findById(accountId);
  if (!account) notFound();

  const [media, comments, metrics] = await Promise.all([
    listMediaForAccount(accountId, 12),
    listCommentsForAccount(accountId, 15),
    listMetricsForAccount(accountId, 15),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg mb-3"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="m15 18-6-6 6-6" />
          </svg>
          All accounts
        </Link>
      </div>

      {/* Hero */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/0 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-5 min-w-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-semibold shadow-xl shadow-indigo-500/20 shrink-0">
              {account.username?.[0]?.toUpperCase() ?? account.brandName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={brandChipClass(account.brandName)}>{account.brandName}</span>
                <span
                  className={
                    account.tokenStatus === "ACTIVE"
                      ? "badge badge-ok badge-dot"
                      : account.tokenStatus === "UNVERIFIED"
                      ? "badge badge-warn badge-dot"
                      : "badge badge-err badge-dot"
                  }
                >
                  {account.tokenStatus}
                </span>
              </div>
              <h1 className="text-2xl font-semibold mt-2">{account.name ?? `@${account.username ?? account.igUserId}`}</h1>
              <div className="text-soft text-sm">@{account.username ?? "unknown"}</div>
              <div className="text-[11px] text-faint mono mt-1">IG User ID · {account.igUserId}</div>
              {account.pageName && (
                <div className="text-[11px] text-faint mt-0.5">Page · {account.pageName}</div>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <AccountActions accountId={account.id} />
          </div>
        </div>

        {/* Stat row */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat label="Followers" value={account.followersCount?.toLocaleString()} />
          <Stat label="Following" value={account.followsCount?.toLocaleString()} />
          <Stat label="Media" value={account.mediaCount?.toLocaleString()} />
          <Stat label="Account type" value={account.accountType ?? "—"} />
        </div>

        {/* Sync times */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-[11px]">
          <SyncRow label="Last profile" at={account.lastProfileSyncAt} />
          <SyncRow label="Last media" at={account.lastMediaSyncAt} />
          <SyncRow label="Last insights" at={account.lastInsightSyncAt} />
          <SyncRow label="Last comments" at={account.lastCommentSyncAt} />
        </div>
      </div>

      {/* Media */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">Recent</div>
            <h2 className="font-semibold">Latest media</h2>
          </div>
          <Link href="/dashboard/content" className="text-xs text-soft hover:text-fg">
            View all →
          </Link>
        </div>
        {media.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="9" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            }
            title="No media yet"
            description="Run Sync Media to fetch latest posts."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map((m) => (
              <a
                key={m.id}
                href={m.permalink ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="card card-hover bg-[color:var(--bg-elev-2)] overflow-hidden flex flex-col"
              >
                <div className="aspect-square bg-[color:var(--bg-elev-3)] overflow-hidden">
                  {m.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-faint text-xs uppercase tracking-widest">
                      {m.mediaType ?? "media"}
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex-1 flex flex-col">
                  <div className="text-[10px] text-faint uppercase tracking-wider mb-1">{m.mediaType}</div>
                  <div className="text-xs text-soft line-clamp-2 flex-1">{truncate(m.caption, 60) || "—"}</div>
                  <div className="flex items-center justify-between text-[10px] text-faint mt-2 mono">
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

      {/* Comments + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Engagement</div>
              <h2 className="font-semibold">Recent comments</h2>
            </div>
          </div>
          {comments.length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                  <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.6A8.5 8.5 0 1 1 21 12z" />
                </svg>
              }
              title="No comments yet"
              description="Sync comments or wait for webhook events."
            />
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="flex gap-3 pb-3 border-b border-[color:var(--border-soft)] last:border-0 last:pb-0"
                >
                  <div className="w-8 h-8 rounded-full bg-[color:var(--bg-elev-3)] flex items-center justify-center text-xs font-medium shrink-0">
                    {c.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">@{c.username ?? "anonymous"}</span>
                      <span className="text-[10px] text-faint">{relativeTime(c.timestamp)}</span>
                      {c.likeCount ? (
                        <span className="text-[10px] text-faint mono">♥ {c.likeCount}</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-soft mt-0.5 break-words">{c.text ?? "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Performance</div>
              <h2 className="font-semibold">Metric snapshots</h2>
            </div>
          </div>
          {metrics.length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                  <path d="M3 3v18h18" />
                  <path d="M7 14l4-4 4 4 6-6" />
                </svg>
              }
              title="No data"
              description="Run Sync Insights."
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {metrics.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-elev-2)] p-3"
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="mono text-soft">media #{s.instagramMediaId}</span>
                    <span className="text-faint">{formatDateTime(s.collectedAt)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mt-2 mono">
                    <Metric k="reach" v={s.reach} />
                    <Metric k="imp" v={s.impressions} />
                    <Metric k="likes" v={s.likes} />
                    <Metric k="cmnts" v={s.comments} />
                    <Metric k="shares" v={s.shares} />
                    <Metric k="saves" v={s.saves} />
                  </div>
                  {s.engagementRate != null && (
                    <div className="text-[11px] text-[color:var(--accent)] mt-1.5 font-medium">
                      ER · {s.engagementRate.toFixed(2)}%
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg bg-[color:var(--bg-elev-2)] border border-[color:var(--border-soft)] px-4 py-3">
      <div className="text-[10px] text-faint uppercase tracking-wider">{label}</div>
      <div className="text-lg font-semibold mt-0.5 mono">{value ?? "—"}</div>
    </div>
  );
}

function SyncRow({ label, at }: { label: string; at: Date | null }) {
  return (
    <div className="flex items-center justify-between text-[11px] gap-2">
      <span className="text-faint">{label}</span>
      <span className={at ? "text-soft" : "text-faint"}>{relativeTime(at)}</span>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-faint">{k}</span>
      <span>{v?.toLocaleString() ?? "—"}</span>
    </div>
  );
}

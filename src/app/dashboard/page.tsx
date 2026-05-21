import Link from "next/link";
import { count as commentCount } from "@/server/repo/instagram-comment";
import {
  count as mediaCount,
  listRecentByCreatedAt,
} from "@/server/repo/instagram-media";
import { listRecent as listRecentMetrics } from "@/server/repo/media-metric";
import { count as accountCount } from "@/server/repo/social-account";
import { countPending, listRecent as listRecentEvents } from "@/server/repo/webhook-event";
import { formatDateTime, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const [
    accountCountValue,
    mediaCountValue,
    commentCountValue,
    pendingWebhooks,
    latestEvents,
    latestSnapshots,
  ] = await Promise.all([
    accountCount(),
    mediaCount(),
    commentCount(),
    countPending(),
    listRecentEvents(5),
    listRecentMetrics(5),
  ]);

  // Pull a couple of recent media just to confirm there is data — not displayed.
  await listRecentByCreatedAt(1);

  const cards = [
    { label: "Connected IG Accounts", value: accountCountValue, href: "/dashboard/accounts" },
    { label: "Total Media", value: mediaCountValue, href: "/dashboard/content" },
    { label: "Total Comments", value: commentCountValue, href: "/dashboard/comments" },
    { label: "Pending Webhook Events", value: pendingWebhooks, href: "/dashboard/realtime" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Data ingestion status across Ayres, Ava, and Saifenu Instagram accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card p-4 hover:bg-[color:var(--border)]/30 transition-colors"
          >
            <div className="text-xs text-[color:var(--muted)]">{c.label}</div>
            <div className="text-3xl font-semibold mt-1">{c.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest Webhook Events</h2>
            <Link href="/dashboard/realtime" className="text-xs text-[color:var(--muted)] hover:text-white">
              View all
            </Link>
          </div>
          {latestEvents.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No events yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {latestEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between">
                  <div>
                    <span className="badge badge-info mr-2">{e.fieldName ?? "?"}</span>
                    <span className="text-[color:var(--muted)]">{truncate(e.objectType ?? "", 30)}</span>
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {formatDateTime(e.receivedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest Metric Snapshots</h2>
          </div>
          {latestSnapshots.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No snapshots yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {latestSnapshots.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <div className="text-[color:var(--muted)]">
                    media #{s.instagramMediaId} ·{" "}
                    reach {s.reach ?? "—"} · likes {s.likes ?? "—"} · comments {s.comments ?? "—"}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {formatDateTime(s.collectedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

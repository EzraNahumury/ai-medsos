import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime, relativeTime, truncate } from "@/lib/utils";
import AccountActions from "@/components/accounts/AccountActions";
import { findById } from "@/server/repo/social-account";
import { listBySocialAccount as listMediaForAccount } from "@/server/repo/instagram-media";
import { listBySocialAccount as listCommentsForAccount } from "@/server/repo/instagram-comment";
import { listForSocialAccount as listMetricsForAccount } from "@/server/repo/media-metric";

export const dynamic = "force-dynamic";

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/accounts" className="text-xs text-[color:var(--muted)] hover:text-white">
            ← All accounts
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            {account.brandName} · @{account.username ?? account.igUserId}
          </h1>
          <p className="text-sm text-[color:var(--muted)]">
            IG User ID {account.igUserId} · Page {account.pageName ?? "—"}
          </p>
        </div>
        <AccountActions accountId={account.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Followers" value={account.followersCount} />
        <Stat label="Following" value={account.followsCount} />
        <Stat label="Media" value={account.mediaCount} />
        <Stat label="Token" value={account.tokenStatus} />
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Recent Media</h2>
        {media.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No media synced yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map((m) => (
              <a
                key={m.id}
                href={m.permalink ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="card p-3 hover:bg-[color:var(--border)]/30 transition-colors"
              >
                <div className="text-xs text-[color:var(--muted)]">
                  {m.mediaType ?? "?"} · {formatDateTime(m.timestamp)}
                </div>
                <div className="text-sm mt-2">{truncate(m.caption, 100) || "—"}</div>
                <div className="text-xs text-[color:var(--muted)] mt-2">
                  ❤ {m.likeCount ?? "—"} · 💬 {m.commentsCount ?? "—"}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Recent Comments</h2>
          {comments.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No comments yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {comments.map((c) => (
                <li key={c.id} className="border-b border-[color:var(--border)] pb-2">
                  <div className="flex justify-between text-xs text-[color:var(--muted)]">
                    <span>@{c.username ?? "anonymous"}</span>
                    <span>{relativeTime(c.timestamp)}</span>
                  </div>
                  <div>{c.text ?? "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">Recent Metric Snapshots</h2>
          {metrics.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No insights collected yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {metrics.map((s) => (
                <li key={s.id} className="border-b border-[color:var(--border)] pb-2">
                  <div className="flex justify-between text-xs text-[color:var(--muted)]">
                    <span>media #{s.instagramMediaId}</span>
                    <span>{formatDateTime(s.collectedAt)}</span>
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    reach {s.reach ?? "—"} · imp {s.impressions ?? "—"} · likes {s.likes ?? "—"}{" "}
                    · comments {s.comments ?? "—"} · shares {s.shares ?? "—"} · saves {s.saves ?? "—"}
                    {s.engagementRate !== null && s.engagementRate !== undefined && (
                      <> · ER {s.engagementRate.toFixed(2)}%</>
                    )}
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

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[color:var(--muted)]">{label}</div>
      <div className="text-xl font-semibold mt-1">{value ?? "—"}</div>
    </div>
  );
}

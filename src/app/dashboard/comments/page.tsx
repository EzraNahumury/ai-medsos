import { isValidBrand, relativeTime } from "@/lib/utils";
import {
  count as commentCount,
  countByBrand,
  listAllForDashboard,
} from "@/server/repo/instagram-comment";
import EmptyState from "@/components/ui/EmptyState";
import BrandFilter from "@/components/ui/BrandFilter";

export const dynamic = "force-dynamic";

function brandChipClass(brand: string | null | undefined): string {
  switch (brand) {
    case "Ayres": return "brand-chip brand-chip-ayres";
    case "Ava": return "brand-chip brand-chip-ava";
    case "Saifenu": return "brand-chip brand-chip-saifenu";
    default: return "brand-chip";
  }
}

function sentimentBadge(s: string) {
  switch (s) {
    case "POSITIVE": return "badge badge-ok badge-dot";
    case "NEGATIVE": return "badge badge-err badge-dot";
    case "NEUTRAL": return "badge badge-info badge-dot";
    default: return "badge";
  }
}

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const params = await searchParams;
  const brand = isValidBrand(params.brand) ? params.brand : null;

  const [comments, perBrand, total] = await Promise.all([
    listAllForDashboard(brand ?? undefined, 2000),
    countByBrand(),
    commentCount(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Comments</h1>
        <p className="text-soft mt-1.5">
          Showing {comments.length.toLocaleString()} of {total.toLocaleString()} Instagram comments
          {brand ? <> for <span className="font-medium text-[color:var(--fg)]">{brand}</span></> : <> across all brands</>}.
        </p>
      </div>

      <BrandFilter
        basePath="/dashboard/comments"
        selected={brand}
        countByBrand={perBrand}
        totalCount={total}
      />

      {comments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.6A8.5 8.5 0 1 1 21 12z" />
              </svg>
            }
            title={brand ? `No comments for ${brand} yet` : "No comments yet"}
            description={
              brand
                ? "Run Sync Comments on this brand's account, or wait for webhook events."
                : "Run Sync Comments on a connected account, or wait for webhook events."
            }
          />
        </div>
      ) : (
        <div className="card divide-y divide-[color:var(--border-soft)]">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-4 flex gap-3 hover:bg-[color:var(--bg-elev-2)] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[color:var(--bg-elev-3)] flex items-center justify-center text-xs font-medium shrink-0">
                {c.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.socialAccountBrandName && (
                    <span className={brandChipClass(c.socialAccountBrandName)}>
                      {c.socialAccountBrandName}
                    </span>
                  )}
                  <span className="text-sm font-medium">@{c.username ?? "anonymous"}</span>
                  <span className={sentimentBadge(c.sentiment)}>{c.sentiment}</span>
                  {c.needsHumanReview && (
                    <span className="badge badge-warn badge-dot">review</span>
                  )}
                  <span className="text-[11px] text-[color:var(--fg-faint)] ml-auto whitespace-nowrap">
                    {relativeTime(c.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-[color:var(--fg-soft)] mt-1 break-words">
                  {c.text ?? "—"}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[color:var(--fg-faint)]">
                  {c.likeCount != null && (
                    <span className="mono">♥ {c.likeCount}</span>
                  )}
                  {c.mediaPermalink && (
                    <a
                      href={c.mediaPermalink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[color:var(--accent)] hover:opacity-80 inline-flex items-center gap-1"
                    >
                      Open media
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <path d="M7 17L17 7M17 7H7M17 7v10" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

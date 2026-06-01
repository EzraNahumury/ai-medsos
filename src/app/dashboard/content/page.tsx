import { formatDateTime, isValidBrand, truncate } from "@/lib/utils";
import {
  count as mediaCount,
  countByBrand,
  listAllForDashboard,
} from "@/server/repo/instagram-media";
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

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const params = await searchParams;
  const brand = isValidBrand(params.brand) ? params.brand : null;

  const [media, perBrand, total] = await Promise.all([
    listAllForDashboard(brand ?? undefined, 2000),
    countByBrand(),
    mediaCount(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-[color:var(--fg)]">Content</h1>
          <p className="text-[color:var(--fg-muted)] mt-1 text-[15px]">
            Showing {media.length.toLocaleString()} of {total.toLocaleString()} Instagram media
            {brand ? <> for <span className="font-medium text-[color:var(--fg)]">{brand}</span></> : <> across all brands</>}.
          </p>
        </div>
        <div className="text-xs text-[color:var(--fg-muted)]">
          Tip: run <span className="kbd">Sync Media</span> on each account to refresh.
        </div>
      </div>

      <BrandFilter
        basePath="/dashboard/content"
        selected={brand}
        countByBrand={perBrand}
        totalCount={total}
      />

      <div className="card overflow-hidden">
        {media.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="9" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            }
            title={brand ? `No media for ${brand} yet` : "No media yet"}
            description={
              brand
                ? "Run Sync Media on this brand's account to start ingesting posts."
                : "Run Sync Media on a connected account to start ingesting Instagram posts."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[color:var(--bg-elev-2)] border-b border-[color:var(--border)] text-[11px] font-medium uppercase tracking-wide text-[color:var(--fg-muted)]">
                  <th className="text-left px-4 py-2.5">Brand</th>
                  <th className="text-left px-4 py-2.5">User</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-left px-4 py-2.5">Caption</th>
                  <th className="text-left px-4 py-2.5 whitespace-nowrap">Posted</th>
                  <th className="text-right px-4 py-2.5">Likes</th>
                  <th className="text-right px-4 py-2.5">Comments</th>
                  <th className="text-right px-4 py-2.5">Link</th>
                </tr>
              </thead>
              <tbody>
                {media.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-[color:var(--border-soft)] hover:bg-[color:var(--bg-elev-2)] transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.socialAccountBrandName && (
                        <span className={brandChipClass(m.socialAccountBrandName)}>
                          {m.socialAccountBrandName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--fg-soft)] whitespace-nowrap">
                      @{m.username ?? m.socialAccountUsername ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1 flex-wrap">
                        <span className="badge">{m.mediaType ?? "—"}</span>
                        {m.mediaProductType && (
                          <span className="badge">{m.mediaProductType}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[400px] min-w-[260px]">
                      <div className="truncate text-[color:var(--fg-soft)]">
                        {truncate(m.caption, 100) || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--fg-muted)] whitespace-nowrap">
                      {formatDateTime(m.timestamp)}
                    </td>
                    <td className="px-4 py-3 tnum text-right whitespace-nowrap text-[color:var(--fg)]">
                      {m.likeCount?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3 tnum text-right whitespace-nowrap text-[color:var(--fg)]">
                      {m.commentsCount?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {m.permalink && (
                        <a
                          className="inline-flex items-center gap-1 text-[color:var(--accent)] hover:opacity-80 text-xs"
                          href={m.permalink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                            <path d="M7 17L17 7M17 7H7M17 7v10" />
                          </svg>
                        </a>
                      )}
                    </td>
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

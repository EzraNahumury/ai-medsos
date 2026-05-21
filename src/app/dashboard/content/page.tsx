import { formatDateTime, truncate } from "@/lib/utils";
import { listAllForDashboard } from "@/server/repo/instagram-media";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const media = await listAllForDashboard(undefined, 200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Most recent Instagram media across all connected accounts (top 200).
        </p>
      </div>
      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-[color:var(--muted)]">
            <tr className="border-b border-[color:var(--border)]">
              <th className="text-left py-2 pr-4">Brand</th>
              <th className="text-left py-2 pr-4">User</th>
              <th className="text-left py-2 pr-4">Type</th>
              <th className="text-left py-2 pr-4">Caption</th>
              <th className="text-left py-2 pr-4">Posted</th>
              <th className="text-right py-2 pr-4">Likes</th>
              <th className="text-right py-2 pr-4">Comments</th>
              <th className="text-left py-2 pr-4">Link</th>
            </tr>
          </thead>
          <tbody>
            {media.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-[color:var(--muted)] py-6">
                  No media yet. Run Sync Media on a connected account.
                </td>
              </tr>
            )}
            {media.map((m) => (
              <tr key={m.id} className="border-b border-[color:var(--border)]">
                <td className="py-2 pr-4">{m.socialAccountBrandName ?? "—"}</td>
                <td className="py-2 pr-4">
                  @{m.username ?? m.socialAccountUsername ?? "—"}
                </td>
                <td className="py-2 pr-4 text-xs">
                  {m.mediaType ?? "—"}
                  {m.mediaProductType && (
                    <span className="text-[color:var(--muted)]"> · {m.mediaProductType}</span>
                  )}
                </td>
                <td className="py-2 pr-4">{truncate(m.caption, 60) || "—"}</td>
                <td className="py-2 pr-4 text-xs">{formatDateTime(m.timestamp)}</td>
                <td className="py-2 pr-4 text-right">{m.likeCount ?? "—"}</td>
                <td className="py-2 pr-4 text-right">{m.commentsCount ?? "—"}</td>
                <td className="py-2 pr-4">
                  {m.permalink && (
                    <a
                      className="text-[color:var(--accent)] hover:underline text-xs"
                      href={m.permalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      open
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { formatDateTime } from "@/lib/utils";
import { listAllForDashboard } from "@/server/repo/instagram-comment";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  const comments = await listAllForDashboard(undefined, 200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Comments</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Most recent Instagram comments across all connected accounts (top 200).
        </p>
      </div>
      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-[color:var(--muted)]">
            <tr className="border-b border-[color:var(--border)]">
              <th className="text-left py-2 pr-4">Brand</th>
              <th className="text-left py-2 pr-4">User</th>
              <th className="text-left py-2 pr-4">Comment</th>
              <th className="text-left py-2 pr-4">Posted</th>
              <th className="text-right py-2 pr-4">Likes</th>
              <th className="text-left py-2 pr-4">Sentiment</th>
              <th className="text-left py-2 pr-4">Media</th>
            </tr>
          </thead>
          <tbody>
            {comments.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[color:var(--muted)] py-6">
                  No comments yet. Run Sync Comments on a connected account, or wait for webhooks.
                </td>
              </tr>
            )}
            {comments.map((c) => (
              <tr key={c.id} className="border-b border-[color:var(--border)]">
                <td className="py-2 pr-4">{c.socialAccountBrandName ?? "—"}</td>
                <td className="py-2 pr-4">@{c.username ?? "anonymous"}</td>
                <td className="py-2 pr-4">{c.text ?? "—"}</td>
                <td className="py-2 pr-4 text-xs">{formatDateTime(c.timestamp)}</td>
                <td className="py-2 pr-4 text-right">{c.likeCount ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span className="badge badge-info">{c.sentiment}</span>
                </td>
                <td className="py-2 pr-4">
                  {c.mediaPermalink ? (
                    <a
                      className="text-[color:var(--accent)] hover:underline text-xs"
                      href={c.mediaPermalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      open
                    </a>
                  ) : (
                    "—"
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

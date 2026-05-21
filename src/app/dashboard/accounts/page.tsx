import Link from "next/link";
import { Suspense } from "react";
import { isDevTokenImportEnabled } from "@/lib/env";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { listForDashboard } from "@/server/repo/social-account";
import AccountActions from "@/components/accounts/AccountActions";
import BrandConnectButtons from "@/components/accounts/BrandConnectButtons";
import ConnectStatus from "@/components/accounts/ConnectStatus";
import DevImportTokenForm from "@/components/accounts/DevImportTokenForm";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await listForDashboard();
  const devEnabled = isDevTokenImportEnabled();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Connect Instagram Business Accounts and trigger sync jobs.
        </p>
      </div>

      <Suspense fallback={null}>
        <ConnectStatus />
      </Suspense>

      <BrandConnectButtons />

      {devEnabled && <DevImportTokenForm />}

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Connected Accounts</h3>
        {accounts.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">
            No accounts connected yet. Use a Connect button above or DEV import.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[color:var(--muted)] border-b border-[color:var(--border)]">
                  <th className="py-2 pr-4">Brand</th>
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">IG User ID</th>
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">Token</th>
                  <th className="py-2 pr-4">Last Profile</th>
                  <th className="py-2 pr-4">Last Media</th>
                  <th className="py-2 pr-4">Last Insight</th>
                  <th className="py-2 pr-4">Last Comments</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-[color:var(--border)] align-top">
                    <td className="py-3 pr-4">
                      <Link href={`/dashboard/accounts/${a.id}`} className="hover:underline">
                        {a.brandName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      {a.username ? `@${a.username}` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[color:var(--muted)]">{a.igUserId}</td>
                    <td className="py-3 pr-4 text-xs">
                      {a.pageName ?? "—"}<br />
                      <span className="text-[color:var(--muted)]">{a.pageId ?? ""}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          a.tokenStatus === "ACTIVE"
                            ? "badge badge-ok"
                            : a.tokenStatus === "UNVERIFIED"
                            ? "badge badge-warn"
                            : "badge badge-err"
                        }
                      >
                        {a.tokenStatus}
                      </span>
                      {a.tokenExpiresAt && (
                        <div className="text-xs text-[color:var(--muted)] mt-1">
                          exp {formatDateTime(a.tokenExpiresAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs">{relativeTime(a.lastProfileSyncAt)}</td>
                    <td className="py-3 pr-4 text-xs">{relativeTime(a.lastMediaSyncAt)}</td>
                    <td className="py-3 pr-4 text-xs">{relativeTime(a.lastInsightSyncAt)}</td>
                    <td className="py-3 pr-4 text-xs">{relativeTime(a.lastCommentSyncAt)}</td>
                    <td className="py-3 pr-4">
                      <AccountActions accountId={a.id} />
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

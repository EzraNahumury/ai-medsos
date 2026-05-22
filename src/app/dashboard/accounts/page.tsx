import Link from "next/link";
import { Suspense } from "react";
import { isDevTokenImportEnabled } from "@/lib/env";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { listForDashboard } from "@/server/repo/social-account";
import AccountActions from "@/components/accounts/AccountActions";
import BrandConnectButtons from "@/components/accounts/BrandConnectButtons";
import ConnectStatus from "@/components/accounts/ConnectStatus";
import DevImportTokenForm from "@/components/accounts/DevImportTokenForm";
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

export default async function AccountsPage() {
  const accounts = await listForDashboard();
  const devEnabled = isDevTokenImportEnabled();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-soft mt-1.5">
            Manage Instagram brand connections and trigger sync jobs.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <ConnectStatus />
      </Suspense>

      <BrandConnectButtons />

      {devEnabled && <DevImportTokenForm />}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="section-title">Connected</div>
            <h2 className="font-semibold">{accounts.length} Instagram {accounts.length === 1 ? "account" : "accounts"}</h2>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                  <path d="M9.5 16.5 4.5 21.5M14.5 16.5 19.5 21.5M2 8h4M2 12h4M18 8h4M18 12h4M9 2.5V6M15 2.5V6" />
                  <rect x="6" y="6" width="12" height="10" rx="2" />
                </svg>
              }
              title="No accounts connected"
              description="Connect a brand above via OAuth, or use the DEV import for quick testing."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map((a) => (
              <div key={a.id} className="card card-hover p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-base font-semibold shrink-0">
                    {a.username?.[0]?.toUpperCase() ?? a.brandName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/accounts/${a.id}`} className="flex items-center gap-2 hover:opacity-80">
                      <span className={brandChipClass(a.brandName)}>{a.brandName}</span>
                      <span
                        className={
                          a.tokenStatus === "ACTIVE"
                            ? "badge badge-ok badge-dot"
                            : a.tokenStatus === "UNVERIFIED"
                            ? "badge badge-warn badge-dot"
                            : "badge badge-err badge-dot"
                        }
                      >
                        {a.tokenStatus}
                      </span>
                    </Link>
                    <Link href={`/dashboard/accounts/${a.id}`} className="block mt-1.5 hover:text-fg">
                      <div className="text-base font-medium truncate">@{a.username ?? "unknown"}</div>
                      <div className="text-[11px] text-faint mono mt-0.5 truncate">{a.igUserId}</div>
                    </Link>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[color:var(--bg-elev-2)] border border-[color:var(--border-soft)] px-3 py-2">
                    <div className="text-[10px] text-faint uppercase tracking-wider">Followers</div>
                    <div className="text-base font-semibold mono mt-0.5">{a.followersCount?.toLocaleString() ?? "—"}</div>
                  </div>
                  <div className="rounded-lg bg-[color:var(--bg-elev-2)] border border-[color:var(--border-soft)] px-3 py-2">
                    <div className="text-[10px] text-faint uppercase tracking-wider">Media</div>
                    <div className="text-base font-semibold mono mt-0.5">{a.mediaCount?.toLocaleString() ?? "—"}</div>
                  </div>
                </div>

                {/* Sync times */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                  <SyncLine label="Profile" at={a.lastProfileSyncAt} />
                  <SyncLine label="Media" at={a.lastMediaSyncAt} />
                  <SyncLine label="Insights" at={a.lastInsightSyncAt} />
                  <SyncLine label="Comments" at={a.lastCommentSyncAt} />
                </div>

                {a.tokenExpiresAt && (
                  <div className="text-[10px] text-faint">
                    Token expires {formatDateTime(a.tokenExpiresAt)}
                  </div>
                )}

                <div className="border-t border-[color:var(--border-soft)] pt-4">
                  <AccountActions accountId={a.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SyncLine({ label, at }: { label: string; at: Date | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={at ? "text-soft" : "text-faint"}>{relativeTime(at)}</span>
    </div>
  );
}

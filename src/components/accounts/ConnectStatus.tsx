"use client";

import { useSearchParams } from "next/navigation";

export default function ConnectStatus() {
  const sp = useSearchParams();
  const connected = sp.get("connected");
  if (!connected) return null;
  if (connected === "success") {
    const brand = sp.get("brand");
    const count = sp.get("count");
    return (
      <div className="card p-3 border-green-500/40 bg-green-500/10">
        <p className="text-sm text-green-300">
          Connected {count ?? "?"} Instagram account(s) for brand <b>{brand}</b>.
        </p>
      </div>
    );
  }
  if (connected === "error") {
    const reason = sp.get("reason");
    return (
      <div className="card p-3 border-red-500/40 bg-red-500/10">
        <p className="text-sm text-red-300">
          OAuth failed: <b>{reason ?? "unknown"}</b>. See dashboard audit logs.
        </p>
      </div>
    );
  }
  return null;
}

"use client";

import { useRouter } from "next/navigation";

export default function Header({ email }: { email: string }) {
  const router = useRouter();
  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="h-14 border-b border-[color:var(--border)] flex items-center justify-between px-6">
      <div className="text-sm text-[color:var(--muted)]">
        Signed in as <span className="text-white">{email}</span>
      </div>
      <button onClick={onLogout} className="btn btn-secondary">
        Sign out
      </button>
    </header>
  );
}

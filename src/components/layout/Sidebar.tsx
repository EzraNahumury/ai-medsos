"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/realtime", label: "Realtime" },
  { href: "/dashboard/content", label: "Content" },
  { href: "/dashboard/comments", label: "Comments" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-[color:var(--border)] min-h-screen p-4">
      <div className="text-lg font-semibold mb-6">IG Command</div>
      <nav className="space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                active
                  ? "bg-[color:var(--card)] text-white"
                  : "text-[color:var(--muted)] hover:text-white hover:bg-[color:var(--card)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

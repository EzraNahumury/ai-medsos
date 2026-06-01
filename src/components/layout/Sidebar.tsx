"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const Icon = {
  Overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  Accounts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c1.2-4 4.2-6 8-6s6.8 2 8 6" />
    </svg>
  ),
  AI: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  ),
  Realtime: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M3 12h3l3-8 4 16 3-8h5" />
    </svg>
  ),
  Content: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  Comments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.6A8.5 8.5 0 1 1 21 12z" />
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Overview", icon: Icon.Overview },
      { href: "/dashboard/accounts", label: "Accounts", icon: Icon.Accounts },
      { href: "/dashboard/ai-agent", label: "AI Agent", icon: Icon.AI },
      { href: "/dashboard/realtime", label: "Realtime", icon: Icon.Realtime },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/dashboard/content", label: "Content", icon: Icon.Content },
      { href: "/dashboard/comments", label: "Comments", icon: Icon.Comments },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Icon.Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="w-64 shrink-0 border-r border-[color:var(--border)] min-h-screen px-3 py-5 flex flex-col gap-7 sticky top-0 self-start bg-[color:var(--bg)]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2">
        <div className="w-8 h-8 rounded-lg bg-[color:var(--accent)] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#15170d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="#15170d" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-[color:var(--fg)]">IG Command</span>
          <span className="text-[10px] text-[color:var(--fg-faint)] tracking-wide">Center</span>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--fg-faint)]">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                        : "text-[color:var(--fg-soft)] hover:bg-[color:var(--bg-elev-2)] hover:text-[color:var(--fg)]"
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        active
                          ? "text-[color:var(--accent)]"
                          : "text-[color:var(--fg-faint)] group-hover:text-[color:var(--fg-soft)]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2 rounded-lg bg-[color:var(--bg-elev-2)] border border-[color:var(--border-soft)]">
        <div className="flex items-center gap-2 text-[11px] text-[color:var(--fg-soft)]">
          <span className="live-dot" />
          <span>System operational</span>
        </div>
        <div className="mt-1 text-[10px] text-[color:var(--fg-faint)] mono">v0.1.0 · ingestion</div>
      </div>
    </aside>
  );
}

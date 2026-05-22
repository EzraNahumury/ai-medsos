export function cn(...classes: Array<string | null | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

export function relativeTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  const diff = Date.now() - dt.getTime();
  const sec = Math.round(diff / 1000);
  // Treat any "in the future" within 10 minutes as just-now (clock skew),
  // and anything beyond that as "just now" too — we never want to show "-N".
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return dt.toLocaleDateString();
}

export function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export function safeJson<T>(v: unknown, fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(v)) as T;
  } catch {
    return fallback;
  }
}

export const VALID_BRANDS = ["Ayres", "Ava", "Saifenu"] as const;
export type Brand = (typeof VALID_BRANDS)[number];

export function isValidBrand(s: unknown): s is Brand {
  return typeof s === "string" && (VALID_BRANDS as readonly string[]).includes(s);
}

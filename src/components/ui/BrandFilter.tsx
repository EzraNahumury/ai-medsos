import Link from "next/link";
import { VALID_BRANDS } from "@/lib/utils";

type Props = {
  basePath: string;
  selected: string | null;
  countByBrand: Record<string, number>;
  totalCount: number;
};

const brandDot: Record<string, string> = {
  Ayres: "#ea580c",
  Ava: "#db2777",
  Saifenu: "#0891b2",
};

export default function BrandFilter({
  basePath,
  selected,
  countByBrand,
  totalCount,
}: Props) {
  const pills: Array<{ key: string | null; label: string; count: number }> = [
    { key: null, label: "All", count: totalCount },
    ...VALID_BRANDS.map((b) => ({ key: b, label: b, count: countByBrand[b] ?? 0 })),
  ];

  return (
    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev-2)]">
      {pills.map((p) => {
        const active = (selected ?? null) === p.key;
        const href = p.key ? `${basePath}?brand=${encodeURIComponent(p.key)}` : basePath;
        return (
          <Link
            key={p.key ?? "_all"}
            href={href}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active
                ? "bg-[color:var(--accent)] text-[#15170d] border border-[color:var(--accent)]"
                : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] border border-transparent"
            }`}
          >
            {p.key && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active ? "#15170d" : brandDot[p.key] }} />
            )}
            <span>{p.label}</span>
            <span
              className={`tnum text-[11px] ${
                active ? "text-[#15170d]/70" : "text-[color:var(--fg-faint)]"
              }`}
            >
              {p.count.toLocaleString()}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

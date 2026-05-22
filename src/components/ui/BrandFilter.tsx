import Link from "next/link";
import { VALID_BRANDS } from "@/lib/utils";

type Props = {
  basePath: string;
  selected: string | null;
  countByBrand: Record<string, number>;
  totalCount: number;
};

function brandChipClass(brand: string): string {
  switch (brand) {
    case "Ayres": return "brand-chip-ayres";
    case "Ava": return "brand-chip-ava";
    case "Saifenu": return "brand-chip-saifenu";
    default: return "";
  }
}

export default function BrandFilter({
  basePath,
  selected,
  countByBrand,
  totalCount,
}: Props) {
  const pills: Array<{ key: string | null; label: string; count: number; cls: string }> = [
    { key: null, label: "All", count: totalCount, cls: "" },
    ...VALID_BRANDS.map((b) => ({
      key: b,
      label: b,
      count: countByBrand[b] ?? 0,
      cls: brandChipClass(b),
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p) => {
        const active = (selected ?? null) === p.key;
        const href = p.key ? `${basePath}?brand=${encodeURIComponent(p.key)}` : basePath;
        return (
          <Link
            key={p.key ?? "_all"}
            href={href}
            className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all
              ${
                active
                  ? `${
                      p.key
                        ? `${p.cls} ring-2 ring-offset-2 ring-offset-[color:var(--bg)] ring-current`
                        : "bg-[color:var(--accent-soft)] border-[color:var(--accent-strong)] text-[color:var(--accent)]"
                    }`
                  : `bg-[color:var(--bg-elev-2)] border-[color:var(--border)] text-[color:var(--fg-soft)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--fg)]`
              }
            `}
          >
            <span>{p.label}</span>
            <span
              className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-[10px] mono ${
                active
                  ? "bg-black/30"
                  : "bg-[color:var(--bg-elev-3)] text-[color:var(--fg-muted)]"
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

import { VALID_BRANDS } from "@/lib/utils";

export default function BrandConnectButtons() {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-2">Connect Instagram</h3>
      <p className="text-xs text-[color:var(--muted)] mb-3">
        Connect a Facebook Page + Instagram Business Account via Meta OAuth.
      </p>
      <div className="flex flex-wrap gap-2">
        {VALID_BRANDS.map((b) => (
          <a
            key={b}
            href={`/api/instagram/oauth/start?brand=${encodeURIComponent(b)}`}
            className="btn btn-primary"
          >
            Connect {b}
          </a>
        ))}
      </div>
    </div>
  );
}

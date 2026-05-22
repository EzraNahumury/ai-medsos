import { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg-elev-3)] border border-[color:var(--border)] flex items-center justify-center mb-4 text-[color:var(--fg-muted)]">
        {icon}
      </div>
      <div className="font-semibold text-[color:var(--fg)] mb-1">{title}</div>
      {description && (
        <div className="text-sm text-[color:var(--fg-muted)] max-w-md">
          {description}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

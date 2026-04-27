// Display formatting.

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  if (sec < 60 * 60) return `${Math.round(sec / 60)}m ago`;
  if (sec < 60 * 60 * 24) return `${Math.round(sec / 3600)}h ago`;
  if (sec < 60 * 60 * 24 * 30) return `${Math.round(sec / 86400)}d ago`;
  if (sec < 60 * 60 * 24 * 365) return `${Math.round(sec / (86400 * 30))}mo ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// String normalization helpers used across dedupe, mapping, search.

export function normalizeEmail(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.includes("@")) return trimmed;
  const [local, domain] = trimmed.split("@");
  // Strip Gmail dots and +tags so a@b == a.b+test@b.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const stripped = (local ?? "").split("+")[0]!.replace(/\./g, "");
    return `${stripped}@gmail.com`;
  }
  return `${(local ?? "").split("+")[0]}@${domain}`;
}

export function extractDomain(input: string | null | undefined): string {
  if (!input) return "";
  let raw = input.trim().toLowerCase();
  raw = raw.replace(/^https?:\/\//, "").replace(/^www\./, "");
  raw = raw.split("/")[0]!;
  if (raw.includes("@")) raw = raw.split("@")[1]!;
  return raw;
}

export function normalizeCompanyName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|gmbh|sa|sas|bv|oy|ab|co|company|corp|corporation|holdings|group|labs|studio|studios)\b/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function isEmailish(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t[0]!.toUpperCase() + t.slice(1).toLowerCase());
}

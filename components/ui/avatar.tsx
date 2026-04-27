import clsx from "clsx";
import { initials } from "@/lib/utils/string";

const PALETTE = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

export function Avatar({
  name,
  size = "md",
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const safe = name ?? "?";
  const idx =
    Array.from(safe).reduce((acc, c) => acc + c.charCodeAt(0), 0) % PALETTE.length;
  const sizeCls =
    size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-semibold tracking-tightish",
        sizeCls,
        PALETTE[idx],
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
